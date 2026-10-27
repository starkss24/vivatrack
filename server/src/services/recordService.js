const { VivaRecord, AuditLog, Assignment, AttentionFlag } = require('../models');
const { badRequest, conflict, notFound, forbidden } = require('../utils/AppError');
const { getCourse, assertTaOwnsStudent, assertSessionInRange } = require('./access');

const TRACKED = ['attendance', 'marks', 'remarks'];

function validateMarks(course, attendance, marks) {
  if (attendance === 'absent') {
    if (marks !== undefined && marks !== null) throw badRequest('Marks must be empty when the student is absent', undefined, 'MARKS_NOT_ALLOWED');
    return null;
  }
  if (marks === undefined || marks === null) throw badRequest('Marks are required when the student is present', undefined, 'MARKS_REQUIRED');
  if (marks < 0 || marks > course.maxMarksPerViva) {
    throw badRequest(`Marks must be between 0 and ${course.maxMarksPerViva}`, undefined, 'MARKS_OUT_OF_RANGE');
  }
  return marks;
}

async function writeAudit(record, editorId, action, changes) {
  await AuditLog.create({ record: record._id, editedBy: editorId, action, changes });
}

// Strict create: a duplicate (course, student, session) is a 409. Race conditions are
// caught by the unique index (Mongo code 11000 -> 409 in the error handler).
async function createRecord({ course, ta, studentId, sessionNumber, attendance, marks, remarks }) {
  const exists = await VivaRecord.exists({ course: course._id, student: studentId, sessionNumber });
  if (exists) throw conflict('A record already exists for this student and session. Update it instead.', undefined, 'RECORD_EXISTS');
  const record = await VivaRecord.create({
    course: course._id, student: studentId, ta: ta._id, sessionNumber, attendance, marks, remarks: remarks ?? '',
  });
  await writeAudit(record, ta._id, 'create', TRACKED.map((f) => ({ field: f, oldValue: null, newValue: record[f] ?? null })));
  return record;
}

async function updateRecord(record, ta, { attendance, marks, remarks }) {
  const next = { attendance, marks, remarks: remarks === undefined ? record.remarks : remarks };
  const changes = [];
  for (const f of TRACKED) {
    const oldV = record[f] ?? null;
    const newV = next[f] ?? null;
    if (oldV !== newV && !(f === 'remarks' && (oldV ?? '') === (newV ?? ''))) changes.push({ field: f, oldValue: oldV, newValue: newV });
  }
  if (changes.length === 0) return { record, changed: false };
  record.attendance = next.attendance;
  record.marks = next.marks;
  record.remarks = next.remarks;
  record.ta = ta._id;
  await record.save();
  await writeAudit(record, ta._id, 'update', changes);
  return { record, changed: true };
}

// PUT /ta/records — rules 1, 3, 4, 5, 6.
async function upsertRecord(ta, { courseId, studentId, sessionNumber, attendance, marks, remarks }) {
  const course = await getCourse(courseId);
  await assertTaOwnsStudent(courseId, studentId, ta._id);
  assertSessionInRange(course, sessionNumber);
  const cleanMarks = validateMarks(course, attendance, marks);

  const existing = await VivaRecord.findOne({ course: courseId, student: studentId, sessionNumber });
  if (!existing) {
    const record = await createRecord({ course, ta, studentId, sessionNumber, attendance, marks: cleanMarks, remarks });
    return { record, created: true };
  }
  const { record } = await updateRecord(existing, ta, { attendance, marks: cleanMarks, remarks });
  return { record, created: false };
}

async function getAudit(recordId, user) {
  const record = await VivaRecord.findById(recordId);
  if (!record) throw notFound('Record not found');
  if (user.role === 'ta') {
    const owns = await Assignment.exists({ course: record.course, student: record.student, ta: user._id });
    if (!owns) throw forbidden('This record does not belong to one of your students');
  }
  return AuditLog.find({ record: recordId }).populate('editedBy', 'name role').sort({ createdAt: -1 });
}

// Students list for the TA grading screen.
async function listStudentsForTa(ta, courseId, sessionParam) {
  const course = await getCourse(courseId);
  const assignments = await Assignment.find({ course: courseId, ta: ta._id }).populate('student', 'name email rollNo');
  if (assignments.length === 0) return { course, session: null, progress: { done: 0, total: 0 }, students: [] };
  const session = sessionParam ?? (course.currentSession >= 1 ? course.currentSession : null);
  if (session !== null) assertSessionInRange(course, session);

  const ids = assignments.map((a) => a.student._id);
  const [records, flags] = await Promise.all([
    session ? VivaRecord.find({ course: courseId, student: { $in: ids }, sessionNumber: session }) : [],
    AttentionFlag.find({ course: courseId, student: { $in: ids }, isActive: true }),
  ]);
  const recByStudent = new Map(records.map((r) => [String(r.student), r]));
  const flagByStudent = new Map(flags.map((f) => [String(f.student), f]));

  const students = assignments
    .map((a) => {
      const r = recByStudent.get(String(a.student._id));
      const f = flagByStudent.get(String(a.student._id));
      return {
        student: { id: String(a.student._id), name: a.student.name, email: a.student.email, rollNo: a.student.rollNo },
        status: !r ? 'pending' : r.attendance === 'absent' ? 'absent' : 'done',
        record: r ? { id: String(r._id), attendance: r.attendance, marks: r.marks, remarks: r.remarks, updatedAt: r.updatedAt } : null,
        flag: f ? { id: String(f._id), reason: f.reason } : null,
      };
    })
    .sort((a, b) => (a.student.rollNo || a.student.name).localeCompare(b.student.rollNo || b.student.name));

  return { course, session, progress: { done: records.length, total: assignments.length }, students };
}

module.exports = { upsertRecord, createRecord, updateRecord, getAudit, listStudentsForTa, validateMarks };
