const { startDb, stopDb, resetDb, seedWorld, login, M } = require('./helpers');

let w;
beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => { await resetDb(); w = await seedWorld(); await M.Assignment.deleteMany({}); });

const upload = (agent, courseId, csv, filename = 'a.csv') =>
  agent.post(`/api/admin/assignments/import?courseId=${courseId}`).attach('file', Buffer.from(csv), filename);

test('9. CSV import: mixed rows give correct counts and never abort', async () => {
  const { agent } = await login(w.admin);
  const csv = [
    'student_email,ta_email',
    `${w.s1.email},${w.ta1.email}`,           // created
    `${w.s2.email},${w.ta1.email}`,           // created
    `${w.s1.email},${w.ta1.email}`,           // skipped (same pair)
    `${w.s1.email},${w.ta2.email}`,           // error: different TA
    `nobody@t.test,${w.ta1.email}`,           // error: unknown student
    `${w.s3.email},${w.s2.email}`,            // error: TA is not a TA
    `not-an-email,${w.ta1.email}`,            // error: invalid
    `${w.s3.email},${w.ta2.email}`,           // created
  ].join('\n');
  const res = await upload(agent, w.course._id, csv);
  expect(res.status).toBe(200);
  expect(res.body.created).toBe(3);
  expect(res.body.skipped).toBe(1);
  expect(res.body.errors.map((e) => e.row)).toEqual([5, 6, 7, 8]);
  expect(await M.Assignment.countDocuments()).toBe(3);

  // re-import is idempotent
  const again = await upload(agent, w.course._id, csv);
  expect(again.body.created).toBe(0);
  expect(again.body.skipped).toBe(4);
});

test('CSV import rejects wrong file type, wrong header, oversized file, and non-admins', async () => {
  const { agent } = await login(w.admin);
  expect((await upload(agent, w.course._id, 'a,b\n1,2', 'x.txt')).status).toBe(400);
  expect((await upload(agent, w.course._id, 'a,b\n1,2')).status).toBe(400);
  const big = 'student_email,ta_email\n' + 'a@b.co,c@d.co\n'.repeat(100000);
  expect((await upload(agent, w.course._id, big)).status).toBe(400);
  const stu = await login(w.s1);
  expect((await upload(stu.agent, w.course._id, 'student_email,ta_email\n')).status).toBe(403);
});

test('error row numbers are real file line numbers even with blank lines', async () => {
  const { agent } = await login(w.admin);
  const csv = `student_email,ta_email\n\n${w.s1.email},${w.ta1.email}\n\nnobody@t.test,${w.ta1.email}\n`;
  const res = await upload(agent, w.course._id, csv);
  expect(res.body.created).toBe(1);
  expect(res.body.errors.map((e) => e.row)).toEqual([5]);
});
