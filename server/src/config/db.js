const os = require('os');
const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

const OPTIONS = {
  // `runtimeAdapters.os` is passed explicitly so the driver doesn't need a dynamic import()
  // (which Jest's CommonJS sandbox can't run).
  runtimeAdapters: { os },
  serverSelectionTimeoutMS: 15000,
};

// `mongodb+srv://` URIs need DNS SRV/TXT lookups. Some home/college/ISP resolvers block them
// (error: "querySrv ECONNREFUSED ..."). That's a resolver problem, not an app bug.
const isSrvDnsError = (e) => e && (e.syscall === 'querySrv' || e.syscall === 'queryTxt' || /querySrv|queryTxt/i.test(e.message || ''));

async function connectOnce(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, OPTIONS);
  return mongoose.connection;
}

async function connectDb(uri = env.mongoUri) {
  try {
    return await connectOnce(uri);
  } catch (err) {
    if (!uri.startsWith('mongodb+srv://') || !isSrvDnsError(err)) throw err;
    // Retry once using public resolvers. This only affects c-ares lookups (resolveSrv/resolveTxt),
    // not the OS resolver used for normal connections.
    console.warn('[db] Your DNS server could not resolve the MongoDB SRV record. Retrying with public DNS (8.8.8.8, 1.1.1.1)...');
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    try {
      return await connectOnce(uri);
    } catch (err2) {
      if (isSrvDnsError(err2)) {
        err2.message += '\n\nDNS is blocking MongoDB SRV lookups on this network. Fix: run "npm run mongo:uri" on a network where it works (or use Atlas > Connect > Drivers > "standard connection string" for non-SRV) and put the mongodb:// URI in MONGO_URI. Or switch the laptop DNS to 8.8.8.8 / 1.1.1.1, or use a phone hotspot.';
      }
      throw err2;
    }
  }
}

module.exports = { connectDb };
