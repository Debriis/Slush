import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runSafely } from '../src/utils/runSafely.js';

test('successful async operation resolves true', async () => {
  assert.equal(await runSafely(async () => {}), true);
});

test('rejected platform operation is consumed and failure callback receives no private data', async () => {
  let argumentsReceived;
  const result = await runSafely(
    async () => {
      throw new Error('private platform details');
    },
    (...args) => {
      argumentsReceived = args;
    },
  );
  assert.equal(result, false);
  assert.deepEqual(argumentsReceived, []);
});

test('synchronous failure is also handled', async () => {
  assert.equal(
    await runSafely(() => {
      throw new Error('failure');
    }),
    false,
  );
});
