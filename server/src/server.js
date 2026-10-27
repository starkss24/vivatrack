const http = require('http');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { createApp } = require('./app');
const { initSocket } = require('./services/realtime');

async function main() {
  await connectDb();
  const server = http.createServer(createApp());
  initSocket(server);
  server.listen(env.port, () => console.log(`VivaTrack API listening on :${env.port} (${env.nodeEnv})`));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  if (/whitelist|allowlist|Could not connect to any servers|ReplicaSetNoPrimary/i.test(err.message)) {
    console.error('\nHint: in MongoDB Atlas > Network Access, add this computer\'s IP (or 0.0.0.0/0 for a demo). Also check MONGO_URI user/password.');
  }
  process.exit(1);
});
