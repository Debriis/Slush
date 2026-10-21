import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (
  !['generate', 'validate', 'migrate'].includes(args[0]) ||
  args.some((arg) => ['reset', 'dev', 'resolve', '--force'].includes(arg))
) {
  console.error(
    'Use only generate, validate, migrate status or migrate deploy. Destructive/reset commands are not provided.',
  );
  process.exit(1);
}
const file = path.join(root, '.env'),
  env = { ...(fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {}), ...process.env };
const secrets = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_ANON_KEY']
  .map((key) => env[key])
  .filter(Boolean);
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  try {
    const password = new URL(env[key]).password;
    if (password) secrets.push(password, decodeURIComponent(password));
  } catch {
    /* Missing values are reported by Prisma. */
  }
}
const redact = (output) =>
  secrets
    .sort((a, b) => b.length - a.length)
    .reduce((text, value) => text.split(value).join('[redacted]'), String(output || ''));
const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], {
  cwd: root,
  env,
  encoding: 'utf8',
  windowsHide: true,
  maxBuffer: 8 * 1024 * 1024,
});
if (result.stdout) process.stdout.write(redact(result.stdout));
if (result.stderr) process.stderr.write(redact(result.stderr));
if (result.error)
  console.error('Prisma could not be started. Run npm install and check your Node installation.');
process.exit(result.status ?? 1);
