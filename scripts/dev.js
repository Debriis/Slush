const path = require('node:path');
const fs = require('node:fs');
const { setupEnv } = require('./setup-env');
const { launch, stopChild, backendStatus } = require('./processes');
const root = path.resolve(__dirname, '..');
const backendOnly = process.argv.includes('--backend-only');
const extra = process.argv.slice(2).filter((arg) => arg !== '--backend-only');
const envFile = path.join(root, 'backend/.env');
let backend,
  frontend,
  stopping = false,
  updating = false;
setupEnv(root);
async function refreshBackend() {
  if (stopping || updating) return;
  updating = true;
  try {
    if (backend) {
      stopChild(backend);
      backend = null;
    }
    const status = await backendStatus(root);
    if (!status.ready) {
      console.log(
        `[backend] Waiting for configuration: ${status.fields.join(', ') || 'check backend/.env'}.`,
      );
      console.log(
        '[backend] Edit backend/.env with your own Supabase details. It will restart when saved. Expo remains available.',
      );
      return;
    }
    console.log(
      '[backend] Starting API. /health/ready checks the actual database; no connectivity is assumed.',
    );
    const child = launch(root, 'backend');
    backend = child;
    child.on('error', () =>
      console.error(
        '[backend] Could not start Node. Check your installation. Expo remains running.',
      ),
    );
    child.on('exit', () => {
      if (backend === child) {
        backend = null;
        if (!stopping)
          console.log(
            '[backend] Stopped. Save backend/.env to retry, or run npm run backend separately.',
          );
      }
    });
  } finally {
    updating = false;
  }
}
function shutdown() {
  if (stopping) return;
  stopping = true;
  fs.unwatchFile(envFile);
  stopChild(backend);
  stopChild(frontend);
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
fs.watchFile(envFile, { interval: 1000 }, (current, previous) => {
  if (current.mtimeMs !== previous.mtimeMs)
    void refreshBackend().catch(() =>
      console.error(
        '[backend] Configuration could not be reloaded. Check backend/.env formatting.',
      ),
    );
});
if (!backendOnly) {
  frontend = launch(root, 'frontend', extra);
  frontend.on('error', () =>
    console.error('[frontend] Could not start Expo. Run npm install and npm run frontend.'),
  );
  frontend.on('exit', (code) => {
    if (!stopping)
      console.log(
        `[frontend] Exited (${code ?? 'signal'}). Backend is independent; Ctrl+C stops remaining processes.`,
      );
  });
}
void refreshBackend().catch(() =>
  console.error(
    '[backend] Cannot read configuration. Check backend/.env syntax; no credentials were printed.',
  ),
);
