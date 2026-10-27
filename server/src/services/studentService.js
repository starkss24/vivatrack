const { Assignment, VivaRecord } = require('../models');
const { forbidden } = require('../utils/AppError');
const { getCourse } = require('./access');

async function listCourses(student) {
  const as = await Assignment.find({ student: student._id }).populate('course').populate('ta', 'name');
  return as
    .filter((a) => a.course)
    .map((a) => ({ course: a.course, ta: a.ta ? { id: String(a.ta._id), name: a.ta.name } : null }));
}

async function dashboard(student, courseId) {
  const course = await getCourse(courseId);
  const assignment = await Assignment.findOne({ course: courseId, student: student._id }).populate('ta', 'name');
  if (!assignment) throw forbidden('You are not enrolled in this course');

  const records = await VivaRecord.find({ course: courseId, student: student._id });
  const bySession = new Map(records.map((r) => [r.sessionNumber, r]));

  const sessions = [];
  let totalMarks = 0;
  let present = 0;
  const pendingSessions = [];
  for (let n = 1; n <= course.currentSession; n++) {
    const r = bySession.get(n);
    if (!r) {
      pendingSessions.push(n);
      sessions.push({ sessionNumber: n, status: 'pending', attendance: null, marks: null, remarks: '' });
      continue;
    }
    if (r.attendance === 'present') { present++; totalMarks += r.marks || 0; }
    sessions.push({
      sessionNumber: n,
      status: r.attendance === 'absent' ? 'absent' : 'done',
      attendance: r.attendance,
      marks: r.marks,
      remarks: r.remarks,
    });
  }

  return {
    course: {
      id: String(course._id), name: course.name, code: course.code, totalSessions: course.totalSessions,
      currentSession: course.currentSession, maxMarksPerViva: course.maxMarksPerViva,
    },
    ta: assignment.ta ? { id: String(assignment.ta._id), name: assignment.ta.name } : null,
    sessions,
    totalMarks,
    maxPossible: course.currentSession * course.maxMarksPerViva,
    attendancePercent: course.currentSession ? Math.round((present / course.currentSession) * 100) : 0,
    pendingSessions,
  };
}

module.exports = { listCourses, dashboard };
