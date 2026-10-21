const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { parseEnv } = require('node:util');

function lanAddresses(interfaces = os.networkInterfaces()) {
  return [
    ...new Set(
      Object.entries(interfaces)
        .filter(([name]) => !/loopback|virtual|vethernet|docker|wsl|vpn/i.test(name))
        .flatMap(([, addresses]) =>
          (addresses || [])
            .filter(
              (entry) =>
                entry.family === 'IPv4' &&
                !entry.internal &&
                /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
            )
            .map((entry) => entry.address),
        ),
    ),
  ];
}
function readLocal(file) {
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {};
}
function writeNew(file, lines, log) {
  try {
    fs.writeFileSync(file, `${lines.join('\n')}\n`, { flag: 'wx', mode: 0o600 });
    log(
      `Created ${path.basename(path.dirname(file))}/.env (existing files are never overwritten).`,
    );
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}
function setupEnv(
  root = path.resolve(__dirname, '..'),
  { log = console.log, addresses = lanAddresses(), env = process.env } = {},
) {
  const backend = path.join(root, 'backend', '.env'),
    frontend = path.join(root, 'frontend', '.env');
  const existing = { ...readLocal(backend), ...env },
    ip = addresses[0];
  const publicKey = existing.SUPABASE_ANON_KEY || existing.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const keyIsPublic =
    !publicKey ||
    publicKey.startsWith('sb_publishable_') ||
    (() => {
      try {
        return (
          JSON.parse(Buffer.from(publicKey.split('.')[1] || '', 'base64url').toString()).role ===
          'anon'
        );
      } catch {
        return false;
      }
    })();
  const quote = (value) => JSON.stringify(value || '');
  const origins = [8081, 8083, 8084, 8085].flatMap((port) => [
    `http://localhost:${port}`,
    ...(ip ? [`http://${ip}:${port}`] : []),
  ]);
  writeNew(
    backend,
    [
      '# Fill blank credentials from your own Supabase project. Never commit this file.',
      'PORT=4000',
      `DATABASE_URL=${quote(existing.DATABASE_URL)}`,
      `DIRECT_URL=${quote(existing.DIRECT_URL)}`,
      `SUPABASE_URL=${quote(existing.SUPABASE_URL || existing.EXPO_PUBLIC_SUPABASE_URL)}`,
      `SUPABASE_ANON_KEY=${quote(keyIsPublic ? publicKey : '')}`,
      `CORS_ORIGINS=${quote(origins.join(','))}`,
      'NODE_ENV=development',
      'REVIEWER_USER_IDS=',
    ],
    log,
  );
  writeNew(
    frontend,
    [
      '# Public client values only. Never paste database passwords or service-role keys here.',
      `EXPO_PUBLIC_SUPABASE_URL=${quote(existing.EXPO_PUBLIC_SUPABASE_URL || existing.SUPABASE_URL)}`,
      `EXPO_PUBLIC_SUPABASE_ANON_KEY=${quote(keyIsPublic ? publicKey : '')}`,
      `EXPO_PUBLIC_API_URL=${quote(ip ? `http://${ip}:4000/api` : '')}`,
      '# Web redirect; register the exact URL in Supabase Auth settings.',
      'EXPO_PUBLIC_AUTH_REDIRECT_URL=',
      '# Native defaults to the actual Expo Go URL. Optional override:',
      'EXPO_PUBLIC_NATIVE_AUTH_REDIRECT_URL=',
    ],
    log,
  );
  if (!ip)
    log('No LAN IPv4 detected. Set EXPO_PUBLIC_API_URL to a reachable computer LAN address.');
  if (addresses.length > 1)
    log('Multiple LAN addresses detected; check EXPO_PUBLIC_API_URL matches the phone’s network.');
  return { backend, frontend, ip };
}
if (require.main === module) setupEnv();
module.exports = { setupEnv, lanAddresses, readLocal };
