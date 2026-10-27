const { Course, Assignment, User } = require('../models');
const { notFound, forbidden, badRequest } = require('../utils/AppError');

async function getCourse(courseId) {
  const course = await Course.findById(courseId);
  if (!course) throw notFound('Course not found');
  return course;
}

// Assignment is the single source of truth for who may touch whom.
async function findAssignment(courseId, studentId) {
  return Assignment.findOne({ course: courseId, student: studentId });
}

async function assertTaOwnsStudent(courseId, studentId, taId) {
  const a = await Assignment.findOne({ course: courseId, student: studentId, ta: taId });
  if (!a) throw forbidden('This student is not assigned to you for this course');
  return a;
}

async function getUserWithRole(id, role) {
  const u = await User.findById(id);
  if (!u || u.role !== role) throw notFound(`${role} not found`);
  return u;
}

function assertSessionInRange(course, sessionNumber) {
  if (!Number.isInteger(sessionNumber) || sessionNumber < 1 || sessionNumber > course.totalSessions) {
    throw badRequest(`Session must be between 1 and ${course.totalSessions}`);
  }
  if (sessionNumber > course.currentSession) {
    throw badRequest(
      `Session ${sessionNumber} is not unlocked yet. The course is currently at session ${course.currentSession}.`,
      undefined,
      'SESSION_LOCKED'
    );
  }
}

module.exports = { getCourse, findAssignment, assertTaOwnsStudent, getUserWithRole, assertSessionInRange };
