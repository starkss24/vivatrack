const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  // Hops in front of the app: Render's proxy (1). Behind the Vercel proxy as well, set TRUST_PROXY=2 so
  // rate limits see the real client IP instead of Vercel's shared egress IP.
  app.set('trust proxy', env.trustProxy);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.clientUrls, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  app.use('/health', require('./routes/health'));
  app.use('/api/health', require('./routes/health'));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/ta', require('./routes/ta'));
  app.use('/api/student', require('./routes/student'));
  app.use('/api/chat', require('./routes/chat'));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
