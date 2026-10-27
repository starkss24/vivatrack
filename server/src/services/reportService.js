const { Assignment, VivaRecord } = require('../models');
const { toCsv } = require('../utils/csv');
const { getCourse } = require('./access');

async function pendingReport(courseId) {
  const course = await getCourse(courseId);
  const [assignments, records] = await Promise.all([
    Assignment.find({ course: courseId }).populate('student', 'name email rollNo').populate('ta', 'name email'),
    VivaRecord.find({ course: courseId }).select('student sessionNumber'),
  ]);
  const done = new Map();
  for (const r of records) {
    const k = String(r.student);
    if (!done.has(k)) done.set(k, new Set());
    done.get(k).add(r.sessionNumber);
  }
  const byTa = new Map();
  for (const a of assignments) {
    if (!a.ta || !a.student) continue;
    const key = String(a.ta._id);
    if (!byTa.has(key)) byTa.set(key, { ta: { id: key, name: a.ta.name, email: a.ta.email }, students: [], pendingCount: 0 });
    const have = done.get(String(a.student._id)) || new Set();
    const pendingSessions = [];
    for (let n = 1; n <= course.currentSession; n++) if (!have.has(n)) pendingSessions.push(n);
    const g = byTa.get(key);
    g.students.push({
      student: { id: String(a.student._id), name: a.student.name, email: a.student.email, rollNo: a.student.rollNo },
      pendingSessions,
    });
    g.pendingCount += pendingSessions.length;
  }
  const groups = [...byTa.values()].sort((a, b) => a.ta.name.localeCompare(b.ta.name));
  groups.forEach((g) => g.students.sort((a, b) => (a.student.rollNo || a.student.name).localeCompare(b.student.rollNo || b.student.name)));
  return {
    course: { id: String(course._id), name: course.name, code: course.code, currentSession: course.currentSession },
    totalPending: groups.reduce((s, g) => s + g.pendingCount, 0),
    tas: groups,
  };
}

async function gradesCsv(courseId) {
  const course = await getCourse(courseId);
  const [assignments, records] = await Promise.all([
    Assignment.find({ course: courseId }).populate('student', 'name email rollNo').populate('ta', 'name'),
    VivaRecord.find({ course: courseId }),
  ]);
  const map = new Map(records.map((r) => [`${r.student}:${r.sessionNumber}`, r]));
  const header = ['roll_no', 'name', 'email', 'ta'];
  for (let n = 1; n <= course.totalSessions; n++) header.push(`session_${n}_marks`, `session_${n}_attendance`);
  header.push('total_marks');
  const rows = [header];
  const sorted = assignments.filter((a) => a.student).sort((a, b) => (a.student.rollNo || '').localeCompare(b.student.rollNo || ''));
  for (const a of sorted) {
    const row = [a.student.rollNo || '', a.student.name, a.student.email, a.ta ? a.ta.name : ''];
    let total = 0;
    for (let n = 1; n <= course.totalSessions; n++) {
      const r = map.get(`${a.student._id}:${n}`);
      row.push(r && r.attendance === 'present' ? r.marks : '', r ? r.attendance : '');
      if (r && r.attendance === 'present') total += r.marks;
    }
    row.push(total);
    rows.push(row);
  }
  return { csv: toCsv(rows), filename: `${course.code}-grades.csv` };
}

module.exports = { pendingReport, gradesCsv };
