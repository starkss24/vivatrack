const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

// Use an already-downloaded mongod if present so tests work offline.
const cached = path.join(os.homedir(), '.cache', 'mongodb-binaries');
if (!process.env.MONGOMS_SYSTEM_BINARY && fs.existsSync(cached)) {
  const bin = fs.readdirSync(cached).find((f) => /^mongod-.*[\d]$/.test(f));
  if (bin) {
    process.env.MONGOMS_SYSTEM_BINARY = path.join(cached, bin);
    process.env.MONGOMS_SYSTEM_BINARY_VERSION_CHECK = 'false';
  }
}
