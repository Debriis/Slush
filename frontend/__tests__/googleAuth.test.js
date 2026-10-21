import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startGoogleSignIn } from '../src/features/auth/googleAuth.js';
const redirectTo = 'https://slush.example/reset-password';
function setup(overrides = {}) {
  const calls = [];
  const client = {
    auth: {
      signInWithOAuth: async (options) => {
        calls.push(options);
        return { data: { url: 'https://auth.example/authorize' } };
      },
      setSession: async () => ({}),
      exchangeCodeForSession: async () => ({}),
    },
  };
  return { calls, options: { client, platform: 'web', expoGo: false, redirectTo, ...overrides } };
}
test('web OAuth uses Google and the configured callback', async () => {
  const { calls, options } = setup();
  await startGoogleSignIn(options);
  assert.equal(calls[0].provider, 'google');
  assert.equal(calls[0].options.redirectTo, redirectTo);
  assert.equal(calls[0].options.skipBrowserRedirect, false);
});
test('Expo Go never starts an unsupported OAuth redirect', async () => {
  const { calls, options } = setup({ platform: 'android', expoGo: true });
  await assert.rejects(startGoogleSignIn(options), /Expo Go/);
  assert.equal(calls.length, 0);
});
test('provider failures return safe errors', async () => {
  const { options } = setup();
  options.client.auth.signInWithOAuth = async () => ({
    error: { message: 'private provider error' },
  });
  await assert.rejects(startGoogleSignIn(options), (error) => !error.message.includes('private'));
});
test('browser cancellation leaves the session unchanged', async () => {
  const { options } = setup({ platform: 'ios', openBrowser: async () => ({ type: 'cancel' }) });
  options.client.auth.setSession = () => assert.fail('must not set session');
  await startGoogleSignIn(options);
});
test('native callback rejects a different host', async () => {
  const { options } = setup({
    platform: 'ios',
    openBrowser: async () => ({
      type: 'success',
      url: 'https://other.example/reset-password#access_token=a&refresh_token=b',
    }),
  });
  await assert.rejects(startGoogleSignIn(options), /invalid callback/);
});
test('native code callback exchanges the authorization code', async () => {
  const { options } = setup({
    platform: 'ios',
    openBrowser: async () => ({ type: 'success', url: redirectTo + '?code=unit-test-code' }),
  });
  let received;
  options.client.auth.exchangeCodeForSession = async (code) => {
    received = code;
    return {};
  };
  await startGoogleSignIn(options);
  assert.equal(received, 'unit-test-code');
});
