const fs = require('node:fs');
const path = require('node:path');
const { backendStatus } = require('./processes');
async function sync() {
  const root = path.resolve(__dirname, '..'),
    status = await backendStatus(root);
  if (!status.ready) {
    console.error(`Backend needs: ${status.fields.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const file = path.join(root, 'frontend/.env');
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries({
    EXPO_PUBLIC_SUPABASE_URL: status.config.SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: status.config.SUPABASE_ANON_KEY,
  })) {
    const line = `${key}=${JSON.stringify(value)}`,
      pattern = new RegExp(`^${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(file, text, { mode: 0o600 });
  console.log(
    'Synchronized only the project URL and validated public key into frontend/.env. Database credentials remain backend-only. Restart Expo to load the changes.',
  );
}
if (require.main === module)
  sync().catch(() => {
    console.error(
      'Public configuration could not be synchronized. No credential values were printed.',
    );
    process.exitCode = 1;
  });
module.exports = { sync };
