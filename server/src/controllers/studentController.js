const asyncHandler = require('../utils/asyncHandler');
const studentService = require('../services/studentService');
const issueService = require('../services/issueService');

exports.courses = asyncHandler(async (req, res) => res.json({ courses: await studentService.listCourses(req.user) }));
exports.dashboard = asyncHandler(async (req, res) => res.json(await studentService.dashboard(req.user, req.params.courseId)));
exports.createIssue = asyncHandler(async (req, res) => {
  const issue = await issueService.createIssue(req.user, req.body);
  res.status(201).json({ issue: { _id: issue._id, course: issue.course, subject: issue.subject, description: issue.description, status: issue.status, createdAt: issue.createdAt } });
});
exports.listIssues = asyncHandler(async (req, res) => res.json({ issues: await issueService.listOwnIssues(req.user) }));
