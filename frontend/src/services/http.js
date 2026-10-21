/** HTTP transport kept independent of React Native for deterministic failure tests. */
export async function requestJson(url, options = {}, timeoutMs = 15000, fetcher = fetch) {
  const { signal, ...rest } = options,
    controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetcher(url, { ...rest, signal: controller.signal });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(
        json?.error?.message || 'The server could not complete this request.',
      );
      error.status = response.status;
      throw error;
    }
    if (!json || !Object.hasOwn(json, 'data'))
      throw new Error('The server returned an invalid response.');
    return json.data;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError)
      throw new Error('Cannot reach SLUSH. Check your connection and backend address.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
