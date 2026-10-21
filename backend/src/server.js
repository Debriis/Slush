import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { readConfig } from './config.js';
import { createApp } from './app.js';

let config;
try {
  config = readConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
const db = new PrismaClient();
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
  },
});
const app = createApp({ db, supabase, config });
const server = app.listen(config.PORT, '0.0.0.0', () =>
  console.log(`SLUSH API listening on port ${config.PORT}. Database readiness: GET /health/ready`),
);
server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE'
      ? `Port ${config.PORT} is already in use. Stop the previous SLUSH backend or change PORT in backend/.env and EXPO_PUBLIC_API_URL in frontend/.env.`
      : 'Could not open the backend port. Check your network permissions and PORT setting.',
  );
  void db.$disconnect().finally(() => process.exit(1));
});
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  setTimeout(() => process.exit(1), 5000).unref();
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
