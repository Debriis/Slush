import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
const envFile = fileURLToPath(new URL('../.env', import.meta.url));
try {
  loadEnvFile(envFile);
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error(
      'Cannot read backend/.env. Check its syntax and permissions. No credentials were printed.',
    );
    process.exit(1);
  }
}
await import('./server.js');
