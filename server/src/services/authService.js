const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { unauthorized, forbidden } = require('../utils/AppError');

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  // Always run a bcrypt compare so response time doesn't reveal whether the email exists.
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw unauthorized('Invalid email or password');
  if (!user.isActive) throw forbidden('This account has been deactivated');
  return user;
}

module.exports = { login };
