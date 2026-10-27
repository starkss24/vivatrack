const { AttentionFlag, Assignment } = require('../models');
const { conflict, notFound, forbidden } = require('../utils/AppError');
const { getCourse, assertTaOwnsStudent, getUserWithRole } = require('./access');

async function createFlag(user, { courseId, studentId, reason }) {
  await getCourse(courseId);
  await getUserWithRole(studentId, 'student');
  if (user.role === 'ta') await assertTaOwnsStudent(courseId, studentId, user._id);

  const active = await AttentionFlag.exists({ course: courseId, student: studentId, isActive: true });
  if (active) throw conflict('This student already has an active flag', undefined, 'FLAG_EXISTS');
  try {
    return await AttentionFlag.create({ course: courseId, student: studentId, flaggedBy: user._id, reason });
  } catch (e) {
    if (e.code === 11000) throw conflict('This student already has an active flag', undefined, 'FLAG_EXISTS');
    throw e;
  }
}

async function resolveFlag(user, flagId) {
  const flag = await AttentionFlag.findById(flagId);
  if (!flag) throw notFound('Flag not found');
  if (user.role === 'ta') {
    const owns = await Assignment.exists({ course: flag.course, student: flag.student, ta: user._id });
    if (!owns) throw forbidden('This student is not assigned to you');
  }
  if (!flag.isActive) throw conflict('Flag is already resolved', undefined, 'FLAG_RESOLVED');
  flag.isActive = false;
  flag.resolvedAt = new Date();
  flag.resolvedBy = user._id;
  await flag.save();
  return flag;
}

const populate = (q) => q.populate('student', 'name email rollNo').populate('course', 'name code').populate('flaggedBy', 'name role').sort({ createdAt: -1 });

async function listFlagsForTa(ta, { courseId, active }) {
  const match = { ta: ta._id };
  if (courseId) match.course = courseId;
  const mine = await Assignment.find(match).select('course student');
  if (mine.length === 0) return [];
  const q = { $or: mine.map((a) => ({ course: a.course, student: a.student })) };
  if (active !== undefined) q.isActive = active;
  return populate(AttentionFlag.find(q));
}

async function listFlagsForAdmin({ courseId, active }) {
  const q = {};
  if (courseId) q.course = courseId;
  if (active !== undefined) q.isActive = active;
  return populate(AttentionFlag.find(q));
}

module.exports = { createFlag, resolveFlag, listFlagsForTa, listFlagsForAdmin };
