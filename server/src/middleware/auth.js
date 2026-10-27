const { COOKIE_NAME, verifyToken } = require('../utils/token');
const { unauthorized, forbidden } = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

// Role and active-state are always re-read from the DB, never trusted from the token.
const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized('Session expired, please log in again');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw unauthorized('Account not available');
  req.user = user;
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

module.exports = { authenticate, requireRole };
