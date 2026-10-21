const isLoopback = (host) => ['localhost', '127.0.0.1', '[::1]'].includes(host);
const isPrivateIp = (host) =>
  /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);

/** Local web development uses loopback; phones retain the configured LAN API. */
export function resolveApiAddress(configured, { web = false, hostname, override } = {}) {
  if (!web) return configured;
  if (override) return override;
  try {
    const url = new URL(configured);
    if (url.protocol === 'http:' && isLoopback(hostname) && isPrivateIp(url.hostname)) {
      url.hostname = hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // Leave invalid configuration to the central validator.
  }
  return configured;
}
