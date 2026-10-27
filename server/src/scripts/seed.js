// Wipes and recreates demo data. Only runs when invoked explicitly: `npm run seed`.
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { connectDb } = require('../config/db');
const mongoose = require('mongoose');
const M = require('../models');

async function run() {
  await connectDb();
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));
  await Promise.all(Object.values(M).map((m) => m.syncIndexes()));

  const passwordHash = await bcrypt.hash(env.seedPassword, 10);
  const mk = (name, email, role, rollNo) => ({ name, email, role, rollNo, passwordHash });

  const [admin, ta1, ta2] = await M.User.create([
    mk('Dr. Meera Iyer', 'admin@demo.test', 'admin'),
    mk('Arjun Rao (TA)', 'ta1@demo.test', 'ta'),
    mk('Kavya Menon (TA)', 'ta2@demo.test', 'ta'),
  ]);
  const names = ['Aarav Shah', 'Diya Patel', 'Rohan Gupta', 'Ananya Singh', 'Vihaan Reddy', 'Ishita Nair', 'Kabir Das', 'Meghna Joshi'];
  const students = await M.User.create(names.map((n, i) => mk(n, `student${i + 1}@demo.test`, 'student', `CS23B${String(i + 1).padStart(3, '0')}`)));

  const course = await M.Course.create({ name: 'MERN Stack', code: 'MERN101', totalSessions: 6, currentSession: 4, maxMarksPerViva: 10 });

  const tas = [ta1, ta2];
  await M.Assignment.create(students.map((s, i) => ({ course: course._id, student: s._id, ta: tas[i < 4 ? 0 : 1]._id })));
  const taOf = (i) => tas[i < 4 ? 0 : 1];

  // [studentIdx, session, attendance, marks, remarks]; sessions 1-4 are unlocked. Gaps are intentional (pending).
  const plan = [
    [0, 1, 'present', 9, 'Clear on REST basics'], [0, 2, 'present', 8, ''], [0, 3, 'present', 9, 'Great Mongoose schemas'], [0, 4, 'present', 10, 'Excellent'],
    [1, 1, 'present', 7, ''], [1, 2, 'absent', null, 'Was unwell'], [1, 3, 'present', 6, 'Needs revision on middleware'],
    [2, 1, 'present', 5, 'Weak on async/await'], [2, 2, 'present', 4, ''], [2, 3, 'absent', null, ''],
    [3, 1, 'present', 8, ''], [3, 2, 'present', 9, ''], [3, 3, 'present', 8, ''], [3, 4, 'present', 9, ''],
    [4, 1, 'present', 10, 'Top of the batch'], [4, 2, 'present', 9, ''], [4, 3, 'present', 9, ''],
    [5, 1, 'present', 6, ''], [5, 2, 'present', 7, ''], [5, 4, 'absent', null, ''],
    [6, 1, 'absent', null, ''], [6, 2, 'present', 3, 'Struggling with React state'],
    [7, 1, 'present', 8, ''], [7, 2, 'present', 8, ''], [7, 3, 'present', 7, ''], [7, 4, 'present', 8, ''],
  ];
  for (const [si, session, attendance, marks, remarks] of plan) {
    const rec = await M.VivaRecord.create({ course: course._id, student: students[si]._id, ta: taOf(si)._id, sessionNumber: session, attendance, marks, remarks });
    await M.AuditLog.create({
      record: rec._id, editedBy: taOf(si)._id, action: 'create',
      changes: [['attendance', attendance], ['marks', marks], ['remarks', remarks]].map(([field, v]) => ({ field, oldValue: null, newValue: v })),
    });
  }
  // one edited record so the "edit history" view has content
  const edited = await M.VivaRecord.findOne({ student: students[1]._id, sessionNumber: 3 });
  edited.marks = 6; await edited.save();
  await M.AuditLog.create({ record: edited._id, editedBy: ta1._id, action: 'update', changes: [{ field: 'marks', oldValue: 5, newValue: 6 }] });

  await M.AttentionFlag.create({ course: course._id, student: students[2]._id, flaggedBy: ta1._id, reason: 'Low marks and a missed session — needs a catch-up before session 5.' });
  await M.Issue.create({
    student: students[3]._id, ta: ta1._id, course: course._id, subject: 'Viva slot ran very short',
    description: 'My session 4 viva was cut to about two minutes, so I could not demonstrate the full project. Could this be looked at?',
  });

  // chat: 3 student-TA pairs, small back-and-forth
  const t0 = Date.now() - 3 * 60 * 60 * 1000;
  const script = [
    [students[0], ta1, 0, 'Hi sir, could I get feedback on my session 4 viva?'],
    [ta1, students[0], 4, 'Great work Aarav! Just tidy up error handling in your controllers.'],
    [students[0], ta1, 9, 'Will do, thank you!'],
    [students[2], ta1, 20, 'Hello, I missed session 3. Can I give it next week?'],
    [ta1, students[2], 26, 'Yes, come to the lab on Monday at 4pm. Revise async/await before that.'],
    [students[5], ta2, 40, 'Ma\'am, I was absent for session 4 due to a family function.'],
    [ta2, students[5], 47, 'Okay Ishita, please bring a note and we will reschedule.'],
    [students[5], ta2, 55, 'Thank you ma\'am!'],
    [students[2], ta1, 70, 'I revised. Ready on Monday.'],
  ];
  let n = 0;
  for (const [from, to, mins, body] of script) {
    const isStudent = from.role === 'student';
    await M.Message.create({
      course: course._id, student: isStudent ? from._id : to._id, ta: isStudent ? to._id : from._id,
      sender: from._id, body, clientMessageId: `seed-message-${++n}`, createdAt: new Date(t0 + mins * 60 * 1000),
    });
  }

  console.log('Seeded demo data.');
  console.log(`  admin   : admin@demo.test`);
  console.log(`  TAs     : ta1@demo.test, ta2@demo.test`);
  console.log(`  students: student1@demo.test ... student8@demo.test`);
  console.log('  password: value of SEED_PASSWORD (default documented in README, demo only)');
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
