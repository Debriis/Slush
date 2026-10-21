const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { readLocal, lanAddresses } = require('./setup-env');
const { backendStatus } = require('./processes');
async function check() {
  const root = path.resolve(__dirname, '..'),
    backend = await backendStatus(root);
  console.log(
    backend.ready
      ? 'Backend configuration format: valid (connectivity not yet tested).'
      : `Backend needs: ${backend.fields.join(', ') || 'check .env formatting'}`,
  );
  const publicEnv = { ...readLocal(path.join(root, 'frontend/.env')), ...process.env };
  const { validateFrontendConfig } = await import(
    pathToFileURL(path.join(root, 'frontend/src/config/validation.js')).href
  );
  const issues = validateFrontendConfig({
    supabaseUrl: publicEnv.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: publicEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: publicEnv.EXPO_PUBLIC_API_URL,
    redirectUrl: publicEnv.EXPO_PUBLIC_AUTH_REDIRECT_URL,
    nativeRedirectUrl: publicEnv.EXPO_PUBLIC_NATIVE_AUTH_REDIRECT_URL,
  });
  console.log(
    issues.length
      ? `Frontend needs: ${issues.join(', ')}`
      : 'Frontend configuration format: valid (connectivity not yet tested).',
  );
  const addresses = lanAddresses();
  const url = publicEnv.EXPO_PUBLIC_API_URL;
  if (url) {
    try {
      const host = new URL(url).hostname;
      if (['localhost', '127.0.0.1', '[::1]'].includes(host))
        console.log(
          'Mobile warning: localhost points at the phone, not the computer. Use your reachable LAN IP.',
        );
      else if (/^192\.168\.|^10\.|^172\./.test(host) && !addresses.includes(host))
        console.log(
          'Mobile warning: the API IP no longer matches an active LAN adapter. Update frontend/.env.',
        );
    } catch {
      /* Reported by the validator. */
    }
  }
  if (!backend.ready || issues.length) process.exitCode = 1;
}
check().catch(() => {
  console.error(
    'Configuration files could not be read. Check .env syntax and permissions; no values were printed.',
  );
  process.exitCode = 1;
});
