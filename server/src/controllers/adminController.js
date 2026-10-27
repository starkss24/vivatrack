const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const courseService = require('../services/courseService');
const assignmentService = require('../services/assignmentService');
const reportService = require('../services/reportService');
const issueService = require('../services/issueService');
const flagService = require('../services/flagService');
const recordService = require('../services/recordService');
const { badRequest } = require('../utils/AppError');
const { publicUser } = require('../utils/serialize');

exports.createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.body);
  res.status(201).json({ user: publicUser(user) });
});
exports.listUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.query.role);
  res.json({ users: users.map((u) => ({ ...publicUser(u), isActive: u.isActive })) });
});

exports.createCourse = asyncHandler(async (req, res) => res.status(201).json({ course: await courseService.createCourse(req.body) }));
exports.listCourses = asyncHandler(async (_req, res) => res.json({ courses: await courseService.listCourses() }));
exports.updateCourse = asyncHandler(async (req, res) => res.json({ course: await courseService.updateCourse(req.params.id, req.body) }));

exports.importAssignments = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('Attach a .csv file in the "file" field');
  res.json(await assignmentService.importCsv(req.query.courseId, req.file.buffer));
});
exports.listAssignments = asyncHandler(async (req, res) =>
  res.json({ assignments: await assignmentService.listAssignments(req.query.courseId) }));
exports.reassign = asyncHandler(async (req, res) =>
  res.json({ assignment: await assignmentService.reassign(req.params.id, req.body.taId) }));

exports.pendingReport = asyncHandler(async (req, res) => res.json(await reportService.pendingReport(req.query.courseId)));
exports.exportGrades = asyncHandler(async (req, res) => {
  const { csv, filename } = await reportService.gradesCsv(req.query.courseId);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

exports.listIssues = asyncHandler(async (req, res) => res.json({ issues: await issueService.listForAdmin(req.query.status) }));
exports.getIssue = asyncHandler(async (req, res) => res.json({ issue: await issueService.getForAdmin(req.params.id) }));
exports.updateIssue = asyncHandler(async (req, res) =>
  res.json({ issue: await issueService.adminUpdate(req.user, req.params.id, req.body) }));

exports.listFlags = asyncHandler(async (req, res) => res.json({ flags: await flagService.listFlagsForAdmin(req.query) }));
exports.createFlag = asyncHandler(async (req, res) => res.status(201).json({ flag: await flagService.createFlag(req.user, req.body) }));
exports.resolveFlag = asyncHandler(async (req, res) => res.json({ flag: await flagService.resolveFlag(req.user, req.params.id) }));

exports.recordAudit = asyncHandler(async (req, res) => res.json({ audit: await recordService.getAudit(req.params.id, req.user) }));
