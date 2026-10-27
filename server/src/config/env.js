require('dotenv').config({ quiet: true });

const nodeEnv = process.env.NODE_ENV || 'development';

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vivatrack',
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // CLIENT_URL may hold several comma-separated origins (e.g. to test two logins side by side).
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  // Rate limits are skipped in tests, or when DISABLE_RATE_LIMIT=true (local demo/test data only; keep off in production).
  rateLimitDisabled: nodeEnv === 'test' || process.env.DISABLE_RATE_LIMIT === 'true',
  trustProxy: Number(process.env.TRUST_PROXY) || 1,
  seedPassword: process.env.SEED_PASSWORD || 'Demo@1234',
};

if (env.isProd && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
