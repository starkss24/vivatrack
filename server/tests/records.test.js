const { startDb, stopDb, resetDb, seedWorld, login, M } = require('./helpers');
const recordService = require('../src/services/recordService');

let w;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await resetDb(); w = await seedWorld(); });

const body = (w, over = {}) => ({
  courseId: String(w.course._id), studentId: String(w.s1._id), sessionNumber: 1, attendance: 'present', marks: 8, remarks: 'ok', ...over,
});

describe('TA record upsert rules', () => {
  test('1. TA cannot grade a student not assigned to them (403)', async () => {
    const { agent } = await login(w.ta2);
    const res = await agent.put('/api/ta/records').send(body(w));
    expect(res.status).toBe(403);
    expect(await M.VivaRecord.countDocuments()).toBe(0);
  });

  test('2. TA cannot record a session above currentSession (400)', async () => {
    const { agent } = await login(w.ta1);
    const res = await agent.put('/api/ta/records').send(body(w, { sessionNumber: 4 }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SESSION_LOCKED');
    const ok = await agent.put('/api/ta/records').send(body(w, { sessionNumber: 3 }));
    expect(ok.status).toBe(201);
  });

  test('3. marks above max are rejected, absent with marks rejected, present without marks rejected', async () => {
    const { agent } = await login(w.ta1);
    expect((await agent.put('/api/ta/records').send(body(w, { marks: 11 }))).status).toBe(400);
    expect((await agent.put('/api/ta/records').send(body(w, { marks: -1 }))).status).toBe(400);
    expect((await agent.put('/api/ta/records').send(body(w, { attendance: 'absent', marks: 5 }))).status).toBe(400);
    expect((await agent.put('/api/ta/records').send(body(w, { marks: undefined }))).status).toBe(400);
    const absent = await agent.put('/api/ta/records').send(body(w, { attendance: 'absent', marks: null }));
    expect(absent.status).toBe(201);
    expect(absent.body.record.marks).toBeNull();
  });

  test('4. duplicate create -> 409; PUT updates and writes an AuditLog; no-op update writes none', async () => {
    const { agent } = await login(w.ta1);
    const created = await agent.put('/api/ta/records').send(body(w));
    expect(created.status).toBe(201);
    expect(await M.AuditLog.countDocuments({ action: 'create' })).toBe(1);

    // strict create (service level) on an existing triple is a conflict
    await expect(
      recordService.createRecord({ course: w.course, ta: w.ta1, studentId: w.s1._id, sessionNumber: 1, attendance: 'present', marks: 5 })
    ).rejects.toMatchObject({ status: 409 });

    const updated = await agent.put('/api/ta/records').send(body(w, { marks: 9 }));
    expect(updated.status).toBe(200);
    expect(updated.body.record.marks).toBe(9);
    const logs = await M.AuditLog.find({ action: 'update' }).lean();
    expect(logs).toHaveLength(1);
    expect(logs[0].changes).toEqual([{ field: 'marks', oldValue: 8, newValue: 9 }]);

    const noop = await agent.put('/api/ta/records').send(body(w, { marks: 9 }));
    expect(noop.status).toBe(200);
    expect(await M.AuditLog.countDocuments({ action: 'update' })).toBe(1);
    expect(await M.VivaRecord.countDocuments()).toBe(1);

    const audit = await agent.get(`/api/ta/records/${created.body.record._id}/audit`);
    expect(audit.status).toBe(200);
    expect(audit.body.audit).toHaveLength(2);
  });

  test('concurrent creates never produce duplicates (unique index -> 409)', async () => {
    const { agent } = await login(w.ta1);
    const results = await Promise.all([1, 2, 3].map(() => agent.put('/api/ta/records').send(body(w))));
    expect(results.every((r) => [200, 201, 409].includes(r.status))).toBe(true);
    expect(await M.VivaRecord.countDocuments()).toBe(1);
  });

  test('TA students list reports status + progress', async () => {
    const { agent } = await login(w.ta1);
    await agent.put('/api/ta/records').send(body(w, { sessionNumber: 3 }));
    const res = await agent.get(`/api/ta/courses/${w.course._id}/students?session=3`);
    expect(res.status).toBe(200);
    expect(res.body.progress).toEqual({ done: 1, total: 2 });
    expect(res.body.students.map((s) => s.status).sort()).toEqual(['done', 'pending']);
    expect((await agent.get(`/api/ta/courses/${w.course._id}/students?session=5`)).status).toBe(400);
  });
});
