/** Parse only this app's configured callback. Tokens are never logged or displayed. */
export function parseAuthCallback(value, expected) {
  let url, callback;
  try {
    url = new URL(value);
    callback = new URL(expected);
  } catch {
    return null;
  }
  const path = (u) => u.pathname.replace(/\/+$/, '');
  if (
    url.protocol !== callback.protocol ||
    url.hostname !== callback.hostname ||
    url.port !== callback.port ||
    path(url) !== path(callback)
  )
    return null;
  const params = new URLSearchParams(url.search);
  new URLSearchParams(url.hash.replace(/^#/, '')).forEach((entry, key) => params.set(key, entry));
  if (params.has('error') || params.has('error_description'))
    throw new Error('This sign-in link is invalid or expired.');
  const access_token = params.get('access_token'),
    refresh_token = params.get('refresh_token'),
    code = params.get('code');
  if (!code && (!access_token || !refresh_token)) return null;
  return { access_token, refresh_token, code, recovering: params.get('type') === 'recovery' };
}
