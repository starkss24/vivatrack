const router = require('express').Router();
const { validate, objectId, z } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/studentController');

router.use(authenticate, requireRole('student'));

router.get('/courses', c.courses);
router.get('/courses/:courseId/dashboard', validate({ params: z.object({ courseId: objectId }) }), c.dashboard);
router.post('/issues', validate({
  body: z.object({
    courseId: objectId,
    subject: z.string().trim().min(1, 'Subject is required').max(120),
    description: z.string().trim().min(1, 'Description is required').max(2000),
  }),
}), c.createIssue);
router.get('/issues', c.listIssues);

module.exports = router;
