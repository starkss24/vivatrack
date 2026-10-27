// Converts a mongodb+srv:// URI into the standard mongodb:// form, which needs no DNS SRV lookup.
// Run it ONCE on a network where SRV lookups work, then paste the output into MONGO_URI on the
// machine where they don't:   npm run mongo:uri
const dns = require('dns').promises;
const env = require('../config/env');

async function main() {
  const uri = process.argv[2] || env.mongoUri;
  if (!uri.startsWith('mongodb+srv://')) {
    console.log('MONGO_URI is already a standard (non-SRV) URI. Nothing to convert.');
    return;
  }
  const u = new URL(uri);
  const host = u.hostname;
  const srv = await dns.resolveSrv(`_mongodb._tcp.${host}`);
  let txt = [];
  try { txt = (await dns.resolveTxt(host)).flat(); } catch { /* optional */ }

  const params = new URLSearchParams(txt.join('&'));
  params.set('tls', 'true');
  if (!params.has('retryWrites')) params.set('retryWrites', 'true');
  if (!params.has('w')) params.set('w', 'majority');
  for (const [k, v] of u.searchParams) params.set(k, v);

  const hosts = srv.map((r) => `${r.name}:${r.port}`).join(',');
  const auth = u.username ? `${u.username}:${u.password}@` : '';
  const out = `mongodb://${auth}${hosts}${u.pathname || '/'}?${params.toString()}`;
  console.log('\nPut this in server/.env (keeps your password, so do not share it publicly):\n');
  console.log(`MONGO_URI=${out}\n`);
}

main().catch((e) => { console.error('Could not resolve SRV records:', e.code || e.message); process.exit(1); });
