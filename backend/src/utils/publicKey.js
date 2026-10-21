export function isPublicSupabaseKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('sb_publishable_')) return key.length > 20;
  try {
    return (
      key.split('.').length === 3 &&
      JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'
    );
  } catch {
    return false;
  }
}
