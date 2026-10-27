const { request, app, startDb, stopDb, resetDb, seedWorld, login, uid, M } = require('./helpers');

let w;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await resetDb(); w = await seedWorld(); });

describe('Student privacy and role isolation', () => {
  test('5. student cannot read another student\'s dashboard or chat (403)', async () => {
    const { agent } = await login(w.s4); // not enrolled anywhere
    expect((await agent.get(`/api/student/courses/${w.course._id}/dashboard`)).status).toBe(403);
    const msgs = await agent.get(`/api/chat/messages?courseId=${w.course._id}&withUserId=${w.ta1._id}`);
    expect(msgs.status).toBe(403);
    // an enrolled student only ever receives their own data
    const s1 = await login(w.s1);
    await M.VivaRecord.create({ course: w.course._id, student: w.s2._id, ta: w.ta1._id, sessionNumber: 1, attendance: 'present', marks: 7 });
    const dash = await s1.agent.get(`/api/student/courses/${w.course._id}/dashboard`);
    expect(dash.status).toBe(200);
    expect(dash.body.totalMarks).toBe(0);
    expect(dash.body.pendingSessions).toEqual([1, 2, 3]);
  });

  test('dashboard maths: totals, attendance %, pending', async () => {
    await M.VivaRecord.create([
      { course: w.course._id, student: w.s1._id, ta: w.ta1._id, sessionNumber: 1, attendance: 'present', marks: 8 },
      { course: w.course._id, student: w.s1._id, ta: w.ta1._id, sessionNumber: 2, attendance: 'absent' },
    ]);
    const { agent } = await login(w.s1);
    const d = (await agent.get(`/api/student/courses/${w.course._id}/dashboard`)).body;
    expect(d).toMatchObject({ totalMarks: 8, maxPossible: 30, attendancePercent: 33, pendingSessions: [3] });
    expect(d.sessions.map((s) => s.status)).toEqual(['done', 'absent', 'pending']);
  });

  test('6. TA gets 403 on every Issue endpoint; students never see TA data; no leakage elsewhere', async () => {
    const stu = await login(w.s1);
    const created = await stu.agent.post('/api/student/issues').send({ courseId: String(w.course._id), subject: 'Rude TA', description: 'details', ta: String(w.ta2._id) });
    expect(created.status).toBe(201);
    const issue = await M.Issue.findById(created.body.issue._id);
    expect(String(issue.ta)).toBe(String(w.ta1._id)); // derived from Assignment, client value ignored

    const own = await stu.agent.get('/api/student/issues');
    expect(own.body.issues).toHaveLength(1);
    expect(JSON.stringify(own.body)).not.toContain(String(w.ta1._id));

    const ta = await login(w.ta1);
    const id = String(issue._id);
    const calls = [
      ta.agent.get('/api/admin/issues'), ta.agent.get(`/api/admin/issues/${id}`),
      ta.agent.patch(`/api/admin/issues/${id}`).send({ status: 'resolved' }),
      ta.agent.get('/api/student/issues'), ta.agent.post('/api/student/issues').send({ courseId: String(w.course._id), subject: 'x', description: 'y' }),
    ];
    for (const r of await Promise.all(calls)) expect(r.status).toBe(403);

    for (const url of [`/api/ta/courses`, `/api/ta/courses/${w.course._id}/students`, '/api/chat/conversations', '/api/ta/flags']) {
      const r = await ta.agent.get(url);
      expect(r.status).toBe(200);
      expect(JSON.stringify(r.body).toLowerCase()).not.toContain('issue');
    }

    // a student not enrolled in a course cannot raise an issue for it
    const other = await login(w.s4);
    expect((await other.agent.post('/api/student/issues').send({ courseId: String(w.course._id), subject: 'x', description: 'y' })).status).toBe(403);
  });

  test('8. students cannot reach /admin or /ta; unauthenticated gets 401; deactivated users cannot log in', async () => {
    expect((await request(app).get('/api/admin/courses')).status).toBe(401);
    expect((await request(app).get('/api/student/courses')).status).toBe(401);
    const s = await login(w.s1);
    expect((await s.agent.get('/api/admin/courses')).status).toBe(403);
    expect((await s.agent.get('/api/admin/users')).status).toBe(403);
    expect((await s.agent.get('/api/ta/courses')).status).toBe(403);
    expect((await s.agent.put('/api/ta/records').send({})).status).toBe(403);
    const a = await login(w.admin);
    expect((await a.agent.get('/api/student/courses')).status).toBe(403);

    await M.User.updateOne({ _id: w.s2._id }, { isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: w.s2.email, password: 'Passw0rd!' });
    expect(res.status).toBe(403);
    expect((await request(app).post('/api/auth/login').send({ email: w.s1.email, password: 'wrong' })).status).toBe(401);
  });

  test('login sets an httpOnly cookie, /me works, logout clears it, passwordHash is never returned', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: w.s1.email, password: 'Passw0rd!' });
    expect(r.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash/);
    const { agent } = await login(w.s1);
    expect((await agent.get('/api/auth/me')).body.user.role).toBe('student');
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('Admin rules', () => {
  test('session control: bounds, +1 advance, lowering blocked when records exist above', async () => {
    const { agent } = await login(w.admin);
    const url = `/api/admin/courses/${w.course._id}`;
    expect((await agent.patch(url).send({ currentSession: 4 })).body.course.currentSession).toBe(4);
    expect((await agent.patch(url).send({ currentSession: 7 })).status).toBe(400);
    expect((await agent.patch(url).send({ currentSession: -1 })).status).toBe(400);
    await M.VivaRecord.create({ course: w.course._id, student: w.s1._id, ta: w.ta1._id, sessionNumber: 4, attendance: 'present', marks: 5 });
    expect((await agent.patch(url).send({ currentSession: 3 })).status).toBe(409);
    expect((await agent.patch(url).send({ currentSession: 4 })).status).toBe(200);
  });

  test('flags: TA flags only own students, duplicates 409, students cannot see flags, resolve works', async () => {
    const ta = await login(w.ta1);
    const mine = { courseId: String(w.course._id), studentId: String(w.s1._id), reason: 'Struggling' };
    expect((await ta.agent.post('/api/ta/flags').send({ ...mine, studentId: String(w.s3._id) })).status).toBe(403);
    const f = await ta.agent.post('/api/ta/flags').send(mine);
    expect(f.status).toBe(201);
    expect((await ta.agent.post('/api/ta/flags').send(mine)).status).toBe(409);

    const stu = await login(w.s1);
    const dash = await stu.agent.get(`/api/student/courses/${w.course._id}/dashboard`);
    expect(JSON.stringify(dash.body)).not.toContain('Struggling');
    expect((await stu.agent.get('/api/ta/flags')).status).toBe(403);

    const admin = await login(w.admin);
    expect((await admin.agent.get('/api/admin/flags?active=true')).body.flags).toHaveLength(1);
    const resolved = await admin.agent.patch(`/api/admin/flags/${f.body.flag._id}/resolve`);
    expect(resolved.body.flag.isActive).toBe(false);
    expect(resolved.body.flag.resolvedAt).toBeTruthy();
    // after resolving, a new flag may be raised again
    expect((await admin.agent.post('/api/admin/flags').send({ ...mine, studentId: String(w.s3._id) })).status).toBe(201);
  });

  test('issues: admin lists, replies and changes status', async () => {
    const stu = await login(w.s1);
    const c = await stu.agent.post('/api/student/issues').send({ courseId: String(w.course._id), subject: 'S', description: 'D' });
    const admin = await login(w.admin);
    const id = c.body.issue._id;
    expect((await admin.agent.get('/api/admin/issues?status=open')).body.issues).toHaveLength(1);
    expect((await admin.agent.patch(`/api/admin/issues/${id}`).send({})).status).toBe(400);
    const upd = await admin.agent.patch(`/api/admin/issues/${id}`).send({ status: 'under_review', adminReply: 'Looking into it' });
    expect(upd.body.issue).toMatchObject({ status: 'under_review', adminReply: 'Looking into it' });
    const mine = await stu.agent.get('/api/student/issues');
    expect(mine.body.issues[0].adminReply).toBe('Looking into it');
  });

  test('pending report and grades CSV (escaped)', async () => {
    await M.User.updateOne({ _id: w.s1._id }, { name: 'Doe, "J" =cmd' });
    await M.VivaRecord.create({ course: w.course._id, student: w.s1._id, ta: w.ta1._id, sessionNumber: 1, attendance: 'present', marks: 8 });
    const { agent } = await login(w.admin);
    const rep = (await agent.get(`/api/admin/pending-report?courseId=${w.course._id}`)).body;
    expect(rep.tas).toHaveLength(2);
    const ta1 = rep.tas.find((t) => t.ta.name === 'Ta1');
    expect(ta1.students.find((s) => s.student.name.startsWith('Doe')).pendingSessions).toEqual([2, 3]);
    expect(ta1.students.find((s) => s.student.name === 'S2').pendingSessions).toEqual([1, 2, 3]);

    const csv = await agent.get(`/api/admin/export/grades?courseId=${w.course._id}`);
    expect(csv.headers['content-type']).toMatch(/text\/csv/);
    const lines = csv.text.trim().split('\r\n');
    expect(lines[0]).toBe('roll_no,name,email,ta,session_1_marks,session_1_attendance,session_2_marks,session_2_attendance,session_3_marks,session_3_attendance,session_4_marks,session_4_attendance,session_5_marks,session_5_attendance,session_6_marks,session_6_attendance,total_marks');
    expect(lines[1]).toContain('"Doe, ""J"" =cmd"');
    expect(lines[1]).toMatch(/,8,present,.*,8$/);
  });

  test('reassign moves a student to another TA', async () => {
    const { agent } = await login(w.admin);
    const a = await M.Assignment.findOne({ student: w.s1._id });
    const res = await agent.patch(`/api/admin/assignments/${a._id}`).send({ taId: String(w.ta2._id) });
    expect(res.status).toBe(200);
    expect(res.body.assignment.ta.name).toBe('Ta2');
    expect((await agent.patch(`/api/admin/assignments/${a._id}`).send({ taId: String(w.s2._id) })).status).toBe(400);
  });

  test('malformed ids and Mongo operators are rejected', async () => {
    const { agent } = await login(w.admin);
    expect((await agent.get('/api/admin/assignments?courseId=abc')).status).toBe(400);
    const r = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(r.status).toBe(400);
    void uid;
  });
});
