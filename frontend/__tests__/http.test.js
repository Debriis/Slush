import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestJson } from '../src/services/http.js';
test('valid empty records stay empty', async () =>
  assert.deepEqual(
    await requestJson('https://test.invalid', {}, 100, async () => ({
      ok: true,
      json: async () => ({ data: { items: [], nextPage: null } }),
    })),
    { items: [], nextPage: null },
  ));
test('invalid server JSON produces a friendly error', async () => {
  await assert.rejects(
    requestJson('https://test.invalid', {}, 100, async () => ({
      ok: true,
      json: async () => {
        throw new Error('html');
      },
    })),
    /invalid response/,
  );
});
test('network failures do not expose low-level error details', async () => {
  await assert.rejects(
    requestJson('https://test.invalid', {}, 100, async () => {
      throw new TypeError('internal hostname');
    }),
    /Cannot reach SLUSH/,
  );
});
test('expired auth status is preserved', async () => {
  await assert.rejects(
    requestJson('https://test.invalid', {}, 100, async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Please sign in.' } }),
    })),
    { status: 401 },
  );
});
test('timeouts abort stalled network calls', async () => {
  await assert.rejects(
    requestJson(
      'https://test.invalid',
      {},
      5,
      async (_url, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error(), { name: 'AbortError' })),
          ),
        ),
    ),
    /timed out/,
  );
});
