export function isPublicSupabaseKey(key) {
  if (typeof key !== 'string') return false;
  if (key.startsWith('sb_publishable_')) return key.length > 20;
  try {
    if (key.split('.').length !== 3) return false;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      payload = key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    let bits = 0,
      buffer = 0,
      json = '';
    for (const char of payload.replace(/=+$/, '')) {
      const value = alphabet.indexOf(char);
      if (value < 0) return false;
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        json += String.fromCharCode((buffer >> bits) & 255);
      }
    }
    return JSON.parse(json).role === 'anon';
  } catch {
    return false;
  }
}
export function validateFrontendConfig(values, { native = false } = {}) {
  const issues = [];
  try {
    const url = new URL(values.supabaseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.hostname.includes('YOUR_')
    )
      throw new Error();
  } catch {
    issues.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!isPublicSupabaseKey(values.supabaseKey))
    issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY (public anon/publishable key only)');
  try {
    const url = new URL(values.apiUrl);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/api\/?$/.test(url.pathname) ||
      url.hostname.includes('YOUR_') ||
      (native && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
      throw new Error();
  } catch {
    issues.push('EXPO_PUBLIC_API_URL (use the computer LAN IP on a phone)');
  }
  if (values.redirectUrl) {
    try {
      const url = new URL(values.redirectUrl);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error();
    } catch {
      issues.push('EXPO_PUBLIC_AUTH_REDIRECT_URL (web URL)');
    }
  }
  if (values.nativeRedirectUrl) {
    try {
      const url = new URL(values.nativeRedirectUrl);
      if (!['exp:', 'exps:', 'slush:'].includes(url.protocol)) throw new Error();
    } catch {
      issues.push('EXPO_PUBLIC_NATIVE_AUTH_REDIRECT_URL');
    }
  }
  return issues;
}
