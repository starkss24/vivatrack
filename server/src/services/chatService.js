const mongoose = require('mongoose');
const { Message, Assignment, User, AttentionFlag } = require('../models');
const { forbidden, notFound } = require('../utils/AppError');
const { getCourse } = require('./access');
const { emitToUsers } = require('./realtime');

const oid = (v) => new mongoose.Types.ObjectId(String(v));

function shape(m) {
  return {
    _id: String(m._id), course: String(m.course), student: String(m.student), ta: String(m.ta),
    sender: String(m.sender), body: m.body, clientMessageId: m.clientMessageId, createdAt: m.createdAt,
  };
}

// Resolves (student, ta) for a conversation from the authenticated user + the other party id.
// Never trusts the client for identity. `forSend` demands a *current* assignment (rule 10);
// reading also allows old pairs that already exchanged messages.
async function resolvePair(user, courseId, otherId, { forSend }) {
  if (user.role !== 'student' && user.role !== 'ta') throw forbidden('Chat is only available to students and TAs');
  const studentId = user.role === 'student' ? user._id : otherId;
  const taId = user.role === 'ta' ? user._id : otherId;
  const current = await Assignment.exists({ course: courseId, student: studentId, ta: taId });
  if (current) return { studentId: oid(studentId), taId: oid(taId), current: true };
  if (!forSend) {
    const had = await Message.exists({ course: courseId, student: studentId, ta: taId });
    if (had) return { studentId: oid(studentId), taId: oid(taId), current: false };
  }
  throw forbidden(forSend ? 'You can only message the TA/student you are assigned with in this course' : 'You are not part of this conversation');
}

async function sendMessage(user, { courseId, toUserId, body, clientMessageId }) {
  await getCourse(courseId);
  const { studentId, taId } = await resolvePair(user, courseId, toUserId, { forSend: true });

  const existing = await Message.findOne({ sender: user._id, clientMessageId });
  if (existing) return { message: shape(existing), created: false };

  let doc;
  try {
    doc = await Message.create({ student: studentId, ta: taId, course: courseId, sender: user._id, body, clientMessageId });
  } catch (e) {
    if (e.code === 11000) {
      const dupe = await Message.findOne({ sender: user._id, clientMessageId });
      if (dupe) return { message: shape(dupe), created: false };
    }
    throw e;
  }
  const message = shape(doc);
  emitToUsers([studentId, taId], 'message:new', message);
  return { message, created: true };
}

async function getMessages(user, { courseId, withUserId, before, after, limit }) {
  await getCourse(courseId);
  const { studentId, taId, current } = await resolvePair(user, courseId, withUserId, { forSend: false });
  const base = { course: courseId, student: studentId, ta: taId };

  if (after) {
    const messages = await Message.find({ ...base, createdAt: { $gt: after } }).sort({ createdAt: 1, _id: 1 }).limit(200);
    return { messages: messages.map(shape), hasMore: false, readOnly: !current };
  }

  const q = { ...base };
  if (before) {
    const pivot = await Message.findOne({ _id: before, ...base });
    if (!pivot) throw notFound('Message not found in this conversation');
    q.$or = [{ createdAt: { $lt: pivot.createdAt } }, { createdAt: pivot.createdAt, _id: { $lt: pivot._id } }];
  }
  const rows = await Message.find(q).sort({ createdAt: -1, _id: -1 }).limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  return { messages: page.map(shape), hasMore, readOnly: !current };
}

// Student: one entry per course (current TA) + read-only entries for former TAs with history.
// TA: every assigned student, even with no messages, + read-only former mentees with history.
async function listConversations(user, { courseId, q }) {
  const isTa = user.role === 'ta';
  const mineField = isTa ? 'ta' : 'student';
  const otherField = isTa ? 'student' : 'ta';

  const assignFilter = { [mineField]: user._id };
  if (courseId) assignFilter.course = courseId;
  const assignments = await Assignment.find(assignFilter);

  const msgMatch = { [mineField]: user._id };
  if (courseId) msgMatch.course = oid(courseId);
  const lasts = await Message.aggregate([
    { $match: msgMatch },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: { course: '$course', student: '$student', ta: '$ta' }, last: { $first: '$$ROOT' } } },
  ]);

  const entries = new Map();
  const key = (c, s, t) => `${c}:${s}:${t}`;
  for (const a of assignments) {
    entries.set(key(a.course, a.student, a.ta), { course: a.course, student: a.student, ta: a.ta, readOnly: false, last: null });
  }
  for (const l of lasts) {
    const k = key(l._id.course, l._id.student, l._id.ta);
    const e = entries.get(k) || { course: l._id.course, student: l._id.student, ta: l._id.ta, readOnly: true, last: null };
    e.last = l.last;
    entries.set(k, e);
  }

  const list = [...entries.values()];
  const otherIds = [...new Set(list.map((e) => String(e[otherField])))];
  const courseIds = [...new Set(list.map((e) => String(e.course)))];
  const [users, courses, flags] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select('name rollNo'),
    require('../models').Course.find({ _id: { $in: courseIds } }).select('name code'),
    isTa
      ? AttentionFlag.find({ isActive: true, student: { $in: otherIds }, course: { $in: courseIds } })
      : [],
  ]);
  const uMap = new Map(users.map((u) => [String(u._id), u]));
  const cMap = new Map(courses.map((c) => [String(c._id), c]));
  const fMap = new Map(flags.map((f) => [`${f.course}:${f.student}`, f]));

  let out = list.map((e) => {
    const other = uMap.get(String(e[otherField]));
    const course = cMap.get(String(e.course));
    const flag = isTa ? fMap.get(`${e.course}:${e.student}`) : null;
    return {
      course: { id: String(e.course), name: course?.name, code: course?.code },
      with: { id: String(e[otherField]), name: other?.name || 'Unknown', rollNo: other?.rollNo || null },
      readOnly: e.readOnly,
      lastMessage: e.last
        ? { body: e.last.body.slice(0, 120), createdAt: e.last.createdAt, mine: String(e.last.sender) === String(user._id) }
        : null,
      ...(isTa ? { flag: flag ? { id: String(flag._id), reason: flag.reason } : null } : {}),
    };
  });

  if (q) {
    const needle = q.toLowerCase();
    out = out.filter((c) => c.with.name.toLowerCase().includes(needle) || (c.with.rollNo || '').toLowerCase().includes(needle));
  }
  out.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const tb = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return tb - ta || a.with.name.localeCompare(b.with.name);
  });
  return out;
}

module.exports = { sendMessage, getMessages, listConversations };
