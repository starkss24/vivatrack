const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const { connectDb } = require('../src/config/db');
const M = require('../src/models');

let mongod;
const app = createApp();
const PASSWORD = 'Passw0rd!';

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await connectDb(mongod.getUri());
  await Promise.all(Object.values(M).map((m) => m.syncIndexes()));
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

async function resetDb() {
  await Promise.all(Object.values(M).map((m) => m.deleteMany({})));
}

// admin, two TAs, four students (s1,s2 -> ta1; s3 -> ta2; s4 unassigned), one course at session 3 of 6.
async function seedWorld() {
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  const mk = (name, role, rollNo) => ({ name, email: `${name.toLowerCase()}@t.test`, role, rollNo, passwordHash });
  const [admin, ta1, ta2, s1, s2, s3, s4] = await M.User.create([
    mk('Admin', 'admin'), mk('Ta1', 'ta'), mk('Ta2', 'ta'),
    mk('S1', 'student', 'R1'), mk('S2', 'student', 'R2'), mk('S3', 'student', 'R3'), mk('S4', 'student', 'R4'),
  ]);
  const course = await M.Course.create({ name: 'MERN', code: 'M101', totalSessions: 6, currentSession: 3, maxMarksPerViva: 10 });
  await M.Assignment.create([
    { course: course._id, student: s1._id, ta: ta1._id },
    { course: course._id, student: s2._id, ta: ta1._id },
    { course: course._id, student: s3._id, ta: ta2._id },
  ]);
  return { admin, ta1, ta2, s1, s2, s3, s4, course };
}

async function login(user) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${user.email}: ${res.status}`);
  const cookie = res.headers['set-cookie'][0].split(';')[0];
  return { agent, cookie };
}

const uid = () => `cid-${Math.random().toString(36).slice(2)}-${Date.now()}`;

module.exports = { app, request, startDb, stopDb, resetDb, seedWorld, login, uid, PASSWORD, M };
