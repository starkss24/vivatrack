const { Server } = require('socket.io');
const env = require('../config/env');
const { COOKIE_NAME, verifyToken } = require('../utils/token');
const { User } = require('../models');

let io = null;

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Authenticates the handshake from the httpOnly JWT cookie. Each socket joins only its own
// private room; there are no client-driven join events, so a client can never subscribe
// to someone else's messages.
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrls, credentials: true },
    transports: ['polling', 'websocket'], // keep long-polling fallback enabled
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[COOKIE_NAME];
      if (!token) return next(new Error('unauthenticated'));
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) return next(new Error('unauthenticated'));
      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error('unauthenticated'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });
  return io;
}

function emitToUsers(userIds, event, payload) {
  if (!io) return;
  let target = io;
  for (const id of userIds) target = target.to(`user:${id}`);
  target.emit(event, payload);
}

function closeSocket() {
  if (io) { io.close(); io = null; }
}

module.exports = { initSocket, emitToUsers, closeSocket };
