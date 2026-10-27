const router = require('express').Router();
const { validate, objectId, z } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/taController');

router.use(authenticate, requireRole('ta'));

const id = z.object({ id: objectId });
const boolish = z.enum(['true', 'false']).transform((v) => v === 'true');

router.get('/courses', c.courses);
router.get('/courses/:courseId/students', validate({
  params: z.object({ courseId: objectId }),
  query: z.object({ session: z.coerce.number().int().min(1).optional() }),
}), c.students);

router.put('/records', validate({
  body: z.object({
    courseId: objectId,
    studentId: objectId,
    sessionNumber: z.number().int().min(1),
    attendance: z.enum(['present', 'absent']),
    marks: z.number().finite().nullable().optional(),
    remarks: z.string().trim().max(500).optional(),
  }),
}), c.upsertRecord);
router.get('/records/:id/audit', validate({ params: id }), c.recordAudit);

router.get('/flags', validate({ query: z.object({ courseId: objectId.optional(), active: boolish.optional() }) }), c.listFlags);
router.post('/flags', validate({ body: z.object({ courseId: objectId, studentId: objectId, reason: z.string().trim().min(1, 'A reason is required').max(500) }) }), c.createFlag);
router.patch('/flags/:id/resolve', validate({ params: id }), c.resolveFlag);

module.exports = router;
