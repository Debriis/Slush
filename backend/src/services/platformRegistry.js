// Adapters must be explicitly authorized; none is enabled by default.
// A connector's fetchAccepted must verify ownership, use permitted endpoints,
// return canonical unique problems and legitimate submission timestamps, and
// implement bounded timeouts/retries/rate limits before it can be registered.
const adapters = new Map();
export function registerPlatform(name, adapter) {
  if (
    !adapter?.authorized ||
    typeof adapter.verifyOwnership !== 'function' ||
    typeof adapter.fetchAccepted !== 'function'
  )
    throw new Error('An authorized platform adapter is required.');
  adapters.set(name, adapter);
}
export function getPlatform(name) {
  return adapters.get(name) || null;
}
