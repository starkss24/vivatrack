const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { conflict } = require('../utils/AppError');

async function createUser({ name, email, role, rollNo, password }) {
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, email, role, rollNo: rollNo || undefined, passwordHash });
    return user;
  } catch (e) {
    if (e.code === 11000) throw conflict('A user with this email already exists', undefined, 'EMAIL_TAKEN');
    throw e;
  }
}

async function listUsers(role) {
  return User.find(role ? { role } : {}).sort({ role: 1, name: 1 });
}

module.exports = { createUser, listUsers };
