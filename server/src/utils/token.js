const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'vt_token';

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// Cross-site (Vercel -> Render) cookies need SameSite=None; Secure in production.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}

module.exports = { COOKIE_NAME, signToken, verifyToken, cookieOptions };
