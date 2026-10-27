const router = require('express').Router();
const multer = require('multer');
const { validate, objectId, z } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { badRequest } = require('../utils/AppError');
const c = require('../controllers/adminController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    /\.csv$/i.test(file.originalname) ? cb(null, true) : cb(badRequest('Only .csv files are accepted', undefined, 'UPLOAD_ERROR')),
});

router.use(authenticate, requireRole('admin'));

const id = z.object({ id: objectId });
const courseQuery = z.object({ courseId: objectId });
const boolish = z.enum(['true', 'false']).transform((v) => v === 'true');

// users
router.post('/users', validate({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(200),
    role: z.enum(['student', 'ta', 'admin']),
    rollNo: z.string().trim().max(50).optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  }),
}), c.createUser);
router.get('/users', validate({ query: z.object({ role: z.enum(['student', 'ta', 'admin']).optional() }) }), c.listUsers);

// courses
router.post('/courses', validate({
  body: z.object({
    name: z.string().trim().min(1).max(120),
    code: z.string().trim().min(1).max(30),
    totalSessions: z.number().int().min(1).max(100),
    maxMarksPerViva: z.number().min(0).max(1000).optional(),
    currentSession: z.number().int().min(0).optional(),
  }),
}), c.createCourse);
router.get('/courses', c.listCourses);
router.patch('/courses/:id', validate({
  params: id,
  body: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    totalSessions: z.number().int().min(1).max(100).optional(),
    maxMarksPerViva: z.number().min(0).max(1000).optional(),
    currentSession: z.number().int().min(0).optional(),
  }).strict(),
}), c.updateCourse);

// assignments
router.post('/assignments/import', validate({ query: courseQuery }), upload.single('file'), c.importAssignments);
router.get('/assignments', validate({ query: courseQuery }), c.listAssignments);
router.patch('/assignments/:id', validate({ params: id, body: z.object({ taId: objectId }) }), c.reassign);

// reports
router.get('/pending-report', validate({ query: courseQuery }), c.pendingReport);
router.get('/export/grades', validate({ query: courseQuery }), c.exportGrades);

// issues
router.get('/issues', validate({ query: z.object({ status: z.enum(['open', 'under_review', 'resolved']).optional() }) }), c.listIssues);
router.get('/issues/:id', validate({ params: id }), c.getIssue);
router.patch('/issues/:id', validate({
  params: id,
  body: z.object({
    status: z.enum(['open', 'under_review', 'resolved']).optional(),
    adminReply: z.string().trim().min(1).max(2000).optional(),
  }).refine((b) => b.status !== undefined || b.adminReply !== undefined, 'Provide a status and/or a reply'),
}), c.updateIssue);

// flags
router.get('/flags', validate({ query: z.object({ courseId: objectId.optional(), active: boolish.optional() }) }), c.listFlags);
router.post('/flags', validate({ body: z.object({ courseId: objectId, studentId: objectId, reason: z.string().trim().min(1, 'A reason is required').max(500) }) }), c.createFlag);
router.patch('/flags/:id/resolve', validate({ params: id }), c.resolveFlag);

// audit
router.get('/records/:id/audit', validate({ params: id }), c.recordAudit);

module.exports = router;
