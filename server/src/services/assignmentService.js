const { parse } = require('csv-parse/sync');
const { Assignment, User } = require('../models');
const { badRequest, notFound } = require('../utils/AppError');
const { getCourse } = require('./access');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function importCsv(courseId, buffer) {
  await getCourse(courseId);

  let rows;
  try {
    rows = parse(buffer, { columns: (h) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true, relax_column_count: true, info: true });
  } catch (e) {
    throw badRequest(`Could not read CSV: ${e.message}`, undefined, 'CSV_PARSE_ERROR');
  }
  if (rows.length === 0) throw badRequest('CSV has no data rows');
  const first = rows[0].record;
  if (!('student_email' in first) || !('ta_email' in first)) {
    throw badRequest('CSV must have the columns: student_email,ta_email', undefined, 'CSV_BAD_HEADER');
  }

  const result = { created: 0, skipped: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const rowNo = rows[i].info.lines; // real line number in the file (blank lines are skipped by the parser)
    const sEmail = String(rows[i].record.student_email || '').toLowerCase();
    const tEmail = String(rows[i].record.ta_email || '').toLowerCase();
    const fail = (reason) => result.errors.push({ row: rowNo, reason });
    try {
      if (!EMAIL_RE.test(sEmail) || !EMAIL_RE.test(tEmail)) { fail('Missing or invalid email'); continue; }
      const [student, ta] = await Promise.all([User.findOne({ email: sEmail }), User.findOne({ email: tEmail })]);
      if (!student || student.role !== 'student') { fail(`No student found with email ${sEmail}`); continue; }
      if (!ta || ta.role !== 'ta') { fail(`No TA found with email ${tEmail}`); continue; }
      if (!student.isActive || !ta.isActive) { fail('User is deactivated'); continue; }

      const existing = await Assignment.findOne({ course: courseId, student: student._id });
      if (existing) {
        if (String(existing.ta) === String(ta._id)) result.skipped++;
        else fail(`${sEmail} is already assigned to a different TA in this course`);
        continue;
      }
      await Assignment.create({ course: courseId, student: student._id, ta: ta._id });
      result.created++;
    } catch (e) {
      if (e.code === 11000) result.skipped++;
      else fail('Unexpected error while processing this row');
    }
  }
  return result;
}

async function listAssignments(courseId) {
  return Assignment.find({ course: courseId })
    .populate('student', 'name email rollNo')
    .populate('ta', 'name email')
    .sort({ createdAt: 1 });
}

async function reassign(id, taId) {
  const a = await Assignment.findById(id);
  if (!a) throw notFound('Assignment not found');
  const ta = await User.findById(taId);
  if (!ta || ta.role !== 'ta' || !ta.isActive) throw badRequest('Target must be an active TA');
  if (String(a.ta) !== String(ta._id)) {
    a.ta = ta._id;
    await a.save();
  }
  return Assignment.findById(id).populate('student', 'name email rollNo').populate('ta', 'name email');
}


module.exports = { importCsv, listAssignments, reassign };
