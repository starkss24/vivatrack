const http = require('http');
const { io: ioClient } = require('socket.io-client');
const { app, startDb, stopDb, resetDb, seedWorld, login, uid, M } = require('./helpers');
const { initSocket, closeSocket } = require('../src/services/realtime');

let w, server, url;
beforeAll(async () => {
  await startDb();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});
afterAll(async () => {
  closeSocket();
  await new Promise((r) => server.close(r));
  await stopDb();
});
beforeEach(async () => { await resetDb(); w = await seedWorld(); });

const send = (agent, to, body = 'hello', over = {}) =>
  agent.post('/api/chat/messages').send({ courseId: String(w.course._id), toUserId: String(to._id), body, clientMessageId: uid(), ...over });

describe('chat REST rules', () => {
  test('assigned pairs can talk both ways; message identity is derived server-side', async () => {
    const s = await login(w.s1);
    const t = await login(w.ta1);
    const m1 = await send(s.agent, w.ta1, 'hi sir', { sender: String(w.ta1._id), student: String(w.s3._id), ta: String(w.ta2._id) });
    expect(m1.status).toBe(201);
    expect(m1.body.message).toMatchObject({ sender: String(w.s1._id), student: String(w.s1._id), ta: String(w.ta1._id) });
    const m2 = await send(t.agent, w.s1, 'hello');
    expect(m2.body.message.sender).toBe(String(w.ta1._id));
  });

  test('unassigned pairs cannot message each other (both directions) and admin has no chat', async () => {
    const s = await login(w.s1);
    const t = await login(w.ta1);
    expect((await send(s.agent, w.ta2)).status).toBe(403);   // not my TA
    expect((await send(t.agent, w.s3)).status).toBe(403);    // not my student
    expect((await send(t.agent, w.s4)).status).toBe(403);    // unassigned student
    expect((await send(s.agent, w.s2)).status).toBe(403);    // student -> student
    const a = await login(w.admin);
    expect((await send(a.agent, w.s1)).status).toBe(403);
    expect((await a.agent.get('/api/chat/conversations')).status).toBe(403);
    expect(await M.Message.countDocuments()).toBe(0);
  });

  test('a user cannot read another pair\'s messages', async () => {
    const s1 = await login(w.s1);
    await send(s1.agent, w.ta1, 'private');
    const s2 = await login(w.s2);
    const ta2 = await login(w.ta2);
    const q = (id) => `/api/chat/messages?courseId=${w.course._id}&withUserId=${id}`;
    expect((await s2.agent.get(q(w.ta2._id))).status).toBe(403);          // s2 is not with ta2
    expect((await ta2.agent.get(q(w.s1._id))).status).toBe(403);          // ta2 is not with s1
    expect((await s2.agent.get(q(w.ta1._id))).body.messages).toEqual([]); // s2 <-> ta1 is s2's own (empty) thread
    expect((await s1.agent.get(q(w.ta1._id))).body.messages).toHaveLength(1);
  });

  test('empty, whitespace-only and over-length bodies are rejected; plain text is stored as-is', async () => {
    const s = await login(w.s1);
    expect((await send(s.agent, w.ta1, '')).status).toBe(400);
    expect((await send(s.agent, w.ta1, '   \n ')).status).toBe(400);
    expect((await send(s.agent, w.ta1, 'x'.repeat(1001))).status).toBe(400);
    expect((await send(s.agent, w.ta1, 'x'.repeat(1000))).status).toBe(201);
    const html = await send(s.agent, w.ta1, '<img src=x onerror=alert(1)>');
    expect(html.body.message.body).toBe('<img src=x onerror=alert(1)>');
    expect((await send(s.agent, w.ta1, 'hi', { clientMessageId: 'short' })).status).toBe(400);
  });

  test('same clientMessageId twice creates exactly one message (200 on retry)', async () => {
    const s = await login(w.s1);
    const cid = uid();
    const a = await send(s.agent, w.ta1, 'once', { clientMessageId: cid });
    const b = await send(s.agent, w.ta1, 'once', { clientMessageId: cid });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.message._id).toBe(a.body.message._id);
    expect(await M.Message.countDocuments()).toBe(1);
  });

  test('pagination: before / after / limit', async () => {
    const s = await login(w.s1);
    const base = Date.now() - 60000;
    for (let i = 0; i < 7; i++) {
      await M.Message.create({
        course: w.course._id, student: w.s1._id, ta: w.ta1._id, sender: i % 2 ? w.ta1._id : w.s1._id,
        body: `m${i}`, clientMessageId: `seed-msg-${i}`, createdAt: new Date(base + i * 1000),
      });
    }
    const q = `courseId=${w.course._id}&withUserId=${w.ta1._id}`;
    const page1 = (await s.agent.get(`/api/chat/messages?${q}&limit=3`)).body;
    expect(page1.messages.map((m) => m.body)).toEqual(['m4', 'm5', 'm6']);
    expect(page1.hasMore).toBe(true);
    const page2 = (await s.agent.get(`/api/chat/messages?${q}&limit=3&before=${page1.messages[0]._id}`)).body;
    expect(page2.messages.map((m) => m.body)).toEqual(['m1', 'm2', 'm3']);
    const page3 = (await s.agent.get(`/api/chat/messages?${q}&limit=3&before=${page2.messages[0]._id}`)).body;
    expect(page3.messages.map((m) => m.body)).toEqual(['m0']);
    expect(page3.hasMore).toBe(false);
    const after = (await s.agent.get(`/api/chat/messages?${q}&after=${new Date(base + 4000).toISOString()}`)).body;
    expect(after.messages.map((m) => m.body)).toEqual(['m5', 'm6']);
  });

  test('conversations: TA sees all mentees (even with no messages), sorted by activity; student sees their TA; search works', async () => {
    const s1 = await login(w.s1);
    await send(s1.agent, w.ta1, 'ping');
    const ta = await login(w.ta1);
    const list = (await ta.agent.get('/api/chat/conversations')).body.conversations;
    expect(list.map((c) => c.with.name)).toEqual(['S1', 'S2']);
    expect(list[0].lastMessage.body).toBe('ping');
    expect(list[1].lastMessage).toBeNull();
    expect((await ta.agent.get('/api/chat/conversations?q=r2')).body.conversations.map((c) => c.with.name)).toEqual(['S2']);
    const mine = (await s1.agent.get('/api/chat/conversations')).body.conversations;
    expect(mine).toHaveLength(1);
    expect(mine[0].with.name).toBe('Ta1');
    expect(mine[0]).not.toHaveProperty('flag');
  });

  test('after reassignment the old pair can read history, but new messages go only to the current TA', async () => {
    const s = await login(w.s1);
    await send(s.agent, w.ta1, 'before reassign');
    await M.Assignment.updateOne({ student: w.s1._id }, { ta: w.ta2._id });
    const oldTa = await login(w.ta1);
    const q = (id) => `/api/chat/messages?courseId=${w.course._id}&withUserId=${id}`;
    const hist = await oldTa.agent.get(q(w.s1._id));
    expect(hist.status).toBe(200);
    expect(hist.body.messages).toHaveLength(1);
    expect((await send(oldTa.agent, w.s1, 'still there?')).status).toBe(403);
    expect((await send(s.agent, w.ta1, 'old ta?')).status).toBe(403);
    expect((await send(s.agent, w.ta2, 'new ta')).status).toBe(201);
    expect((await s.agent.get(q(w.ta1._id))).body.readOnly).toBe(true);
  });
});

describe('chat sockets', () => {
  const connect = (cookie) =>
    new Promise((resolve, reject) => {
      const sock = ioClient(url, { transports: ['websocket'], extraHeaders: cookie ? { cookie } : {}, reconnection: false });
      sock.on('connect', () => resolve(sock));
      sock.on('connect_error', (e) => { sock.close(); reject(e); });
    });
  const once = (sock, ev, ms = 1500) =>
    new Promise((resolve) => { const t = setTimeout(() => resolve(null), ms); sock.once(ev, (d) => { clearTimeout(t); resolve(d); }); });

  test('connection without a valid cookie is rejected', async () => {
    await expect(connect(undefined)).rejects.toThrow(/unauthenticated/);
    await expect(connect('vt_token=garbage')).rejects.toThrow(/unauthenticated/);
  });

  test('message:new reaches both parties and nobody else', async () => {
    const s1 = await login(w.s1);
    const t1 = await login(w.ta1);
    const s2 = await login(w.s2);
    const sockS1 = await connect(s1.cookie);
    const sockT1 = await connect(t1.cookie);
    const sockS2 = await connect(s2.cookie);

    const [a, b, c] = [once(sockS1, 'message:new'), once(sockT1, 'message:new'), once(sockS2, 'message:new', 700)];
    const res = await send(s1.agent, w.ta1, 'live!');
    expect(res.status).toBe(201);
    const [gotS1, gotT1, gotS2] = await Promise.all([a, b, c]);
    expect(gotS1.body).toBe('live!');
    expect(gotT1._id).toBe(res.body.message._id);
    expect(gotS2).toBeNull();

    // an idempotent retry does not emit a second time
    const dup = once(sockT1, 'message:new', 700);
    await send(s1.agent, w.ta1, 'live!', { clientMessageId: res.body.message.clientMessageId });
    expect(await dup).toBeNull();
    [sockS1, sockT1, sockS2].forEach((s) => s.close());
  });

  test('clients cannot join other users\' rooms', async () => {
    const s2 = await login(w.s2);
    const s1 = await login(w.s1);
    const sock = await connect(s2.cookie);
    sock.emit('join', `user:${w.s1._id}`);
    sock.emit('join:room', `user:${w.s1._id}`);
    const got = once(sock, 'message:new', 700);
    await send(s1.agent, w.ta1, 'secret');
    expect(await got).toBeNull();
    sock.close();
  });
});
