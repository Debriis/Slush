import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { readConfig } from './config.js';
try {
  loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  /* Validator reports missing names. */
}
let config;
try {
  config = readConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const db = new PrismaClient({ datasourceUrl: config.DIRECT_URL });
try {
  await db.$connect();
  const schemas =
    await db.$queryRaw`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public','auth')`;
  const tables =
    await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
  console.log(
    JSON.stringify({
      database: 'connected',
      authSchema: schemas.some((s) => s.schema_name === 'auth'),
      publicTables: tables.map((t) => t.tablename),
    }),
  );
  // Disposable temporary data only. No application records, users or scores are created.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`CREATE TEMP TABLE slush_connection_probe (value integer) ON COMMIT DROP`;
    await tx.$executeRaw`INSERT INTO slush_connection_probe (value) VALUES (1)`;
    const rows = await tx.$queryRaw`SELECT value FROM slush_connection_probe`;
    if (rows[0]?.value !== 1) throw new Error('Probe failed');
  });
  console.log(
    'Database temporary-table read/write check passed. No persistent application data was changed.',
  );
} catch (error) {
  const message = String(error.message || '');
  const labels = [
    [/password authentication failed|authentication failed/i, 'database authentication rejected'],
    [/tenant or user not found/i, 'pooler project/username mismatch'],
    [
      /invalid port|invalid connection string|invalid database string/i,
      'database URI syntax is invalid',
    ],
    [
      /can.t reach|connection refused|timed out|timeout/i,
      'database host is unreachable or timed out',
    ],
    [/certificate|TLS|SSL/i, 'database TLS/certificate failure'],
  ];
  const reason =
    labels.find(([pattern]) => pattern.test(message))?.[1] ||
    'database connection could not initialize';
  console.error(
    JSON.stringify({
      database: 'failed',
      reason,
      errorType: error.name,
      code: error.code || error.errorCode || null,
    }),
  );
  const uri = new URL(config.DIRECT_URL);
  console.log(
    JSON.stringify({
      databaseProjectMatchesApi:
        decodeURIComponent(uri.username).split('.').slice(1).join('.') ===
        new URL(config.SUPABASE_URL).hostname.split('.')[0],
      passwordHasTemplateBrackets:
        decodeURIComponent(uri.password).startsWith('[') &&
        decodeURIComponent(uri.password).endsWith(']'),
    }),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
try {
  const response = await fetch(`${config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/settings`, {
    headers: { apikey: config.SUPABASE_ANON_KEY },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error();
  const data = await response.json();
  console.log(
    JSON.stringify({ supabaseAuth: 'reachable', emailProviderEnabled: !!data.external?.email }),
  );
} catch {
  console.error(
    'Supabase Auth settings could not be reached with the configured public key. No key values were printed.',
  );
  process.exitCode = 1;
}
