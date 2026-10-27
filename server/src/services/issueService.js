const { Issue } = require('../models');
const { forbidden, notFound } = require('../utils/AppError');
const { getCourse, findAssignment } = require('./access');

// Rule 8: `ta` is taken from the student's Assignment, never from client input.
async function createIssue(student, { courseId, subject, description }) {
  await getCourse(courseId);
  const assignment = await findAssignment(courseId, student._id);
  if (!assignment) throw forbidden('You are not enrolled in this course');
  return Issue.create({ student: student._id, ta: assignment.ta, course: courseId, subject, description });
}

// Students never get the `ta` field back.
async function listOwnIssues(student) {
  return Issue.find({ student: student._id }).select('-ta -repliedBy').populate('course', 'name code').sort({ createdAt: -1 });
}

async function listForAdmin(status) {
  return Issue.find(status ? { status } : {})
    .populate('student', 'name email rollNo').populate('ta', 'name email').populate('course', 'name code')
    .sort({ createdAt: -1 });
}

async function getForAdmin(id) {
  const issue = await Issue.findById(id)
    .populate('student', 'name email rollNo').populate('ta', 'name email').populate('course', 'name code').populate('repliedBy', 'name');
  if (!issue) throw notFound('Issue not found');
  return issue;
}

async function adminUpdate(admin, id, { status, adminReply }) {
  const issue = await Issue.findById(id);
  if (!issue) throw notFound('Issue not found');
  if (status) issue.status = status;
  if (adminReply !== undefined) { issue.adminReply = adminReply; issue.repliedBy = admin._id; }
  await issue.save();
  return getForAdmin(id);
}

module.exports = { createIssue, listOwnIssues, listForAdmin, getForAdmin, adminUpdate };
