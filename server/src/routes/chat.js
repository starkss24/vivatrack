const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { validate, objectId, z } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const c = require('../controllers/chatController');
const env = require('../config/env');

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.rateLimitDisabled,
  keyGenerator: (req) => String(req.user._id), // route is behind authenticate()
  message: { error: { code: 'RATE_LIMITED', message: 'You are sending messages too quickly. Slow down a little.' } },
});

router.use(authenticate, requireRole('student', 'ta'));

router.get('/conversations', validate({
  query: z.object({ courseId: objectId.optional(), q: z.string().trim().max(100).optional() }),
}), c.conversations);

router.get('/messages', validate({
  query: z.object({
    courseId: objectId,
    withUserId: objectId,
    before: objectId.optional(),
    after: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  }),
}), c.messages);

router.post('/messages', sendLimiter, validate({
  body: z.object({
    courseId: objectId,
    toUserId: objectId,
    body: z.string().trim().min(1, 'Message cannot be empty').max(1000, 'Message is too long (max 1000 characters)'),
    clientMessageId: z.string().trim().min(8).max(64),
  }).strip(),
}), c.send);

module.exports = router;
