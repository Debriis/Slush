import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthCallback } from '../src/features/auth/authLinks.js';
import { isPublicSupabaseKey, validateFrontendConfig } from '../src/config/validation.js';
const callback = 'exp://192.168.1.13:8081/--/reset-password';
test('native recovery parsing handles fragment tokens and existing query parameters', () => {
  const result = parseAuthCallback(
    `${callback}?source=email#access_token=test-access&refresh_token=test-refresh&type=recovery`,
    callback,
  );
  assert.equal(result.recovering, true);
  assert.equal(result.access_token, 'test-access');
});
test('auth tokens from an unrelated callback are ignored', () =>
  assert.equal(
    parseAuthCallback(
      'exp://other-host:8081/--/reset-password#access_token=test&refresh_token=test',
      callback,
    ),
    null,
  ));
test('PKCE callback codes are recognized without inventing a session', () =>
  assert.equal(parseAuthCallback(`${callback}?code=test-code`, callback).code, 'test-code'));
test('expired email links return a safe error without provider error text', () =>
  assert.throws(
    () =>
      parseAuthCallback(`${callback}#error=expired&error_description=private_details`, callback),
    (error) => !error.message.includes('private_details'),
  ));
test('frontend rejects private keys and service-role JWTs', () => {
  assert.equal(isPublicSupabaseKey('sb_secret_TEST_ONLY_NOT_REAL'), false);
  const payload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
  assert.equal(isPublicSupabaseKey(`test.${payload}.test`), false);
});
test('frontend accepts legacy anon and current public key formats', () => {
  const payload = Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url');
  assert.equal(isPublicSupabaseKey(`test.${payload}.test`), true);
  assert.equal(isPublicSupabaseKey('sb_publishable_TEST_CONFIGURATION_ONLY'), true);
});
test('physical-device config rejects loopback API addresses', () => {
  const values = {
    supabaseUrl: 'https://project-test.supabase.co',
    supabaseKey: 'sb_publishable_TEST_CONFIGURATION_ONLY',
    apiUrl: 'http://localhost:4000/api',
  };
  assert.ok(
    validateFrontendConfig(values, { native: true }).some((key) => key.includes('API_URL')),
  );
  assert.deepEqual(
    validateFrontendConfig({ ...values, apiUrl: 'http://192.168.1.13:4000/api' }, { native: true }),
    [],
  );
});
