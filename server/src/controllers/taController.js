const asyncHandler = require('../utils/asyncHandler');
const taService = require('../services/taService');
const recordService = require('../services/recordService');
const flagService = require('../services/flagService');

exports.courses = asyncHandler(async (req, res) => res.json({ courses: await taService.listCourses(req.user) }));

exports.students = asyncHandler(async (req, res) => {
  const out = await recordService.listStudentsForTa(req.user, req.params.courseId, req.query.session);
  res.json({
    course: { id: String(out.course._id), name: out.course.name, code: out.course.code, currentSession: out.course.currentSession,
      totalSessions: out.course.totalSessions, maxMarksPerViva: out.course.maxMarksPerViva },
    session: out.session, progress: out.progress, students: out.students,
  });
});

exports.upsertRecord = asyncHandler(async (req, res) => {
  const { record, created } = await recordService.upsertRecord(req.user, req.body);
  res.status(created ? 201 : 200).json({ record, created });
});
exports.recordAudit = asyncHandler(async (req, res) => res.json({ audit: await recordService.getAudit(req.params.id, req.user) }));

exports.createFlag = asyncHandler(async (req, res) => res.status(201).json({ flag: await flagService.createFlag(req.user, req.body) }));
exports.resolveFlag = asyncHandler(async (req, res) => res.json({ flag: await flagService.resolveFlag(req.user, req.params.id) }));
exports.listFlags = asyncHandler(async (req, res) => res.json({ flags: await flagService.listFlagsForTa(req.user, req.query) }));
