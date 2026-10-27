const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { validate, z } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const c = require('../controllers/authController');
const env = require('../config/env');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.rateLimitDisabled,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' } },
});

const loginBody = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200) });

router.post('/login', loginLimiter, validate({ body: loginBody }), c.login);
router.post('/logout', c.logout);
router.get('/me', authenticate, c.me);

module.exports = router;
