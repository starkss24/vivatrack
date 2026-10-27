const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { COOKIE_NAME, signToken, cookieOptions } = require('../utils/token');
const { publicUser } = require('../utils/serialize');

exports.login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body.email, req.body.password);
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
  res.json({ user: publicUser(user) });
});

exports.logout = (_req, res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
  res.json({ ok: true });
};

exports.me = (req, res) => res.json({ user: publicUser(req.user) });
