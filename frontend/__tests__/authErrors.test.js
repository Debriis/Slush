import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAuthError } from '../src/features/auth/authErrors.js';
test('429 is actionable for every password flow', () => {
  for (const mode of ['login', 'register', 'reset']) {
    const result = describeAuthError({ status: 429 }, mode);
    assert.equal(result.cooldown, true);
    assert.match(result.message, /wait/i);
  }
});
test('email quota explains confirmation inbox and SMTP', () => {
  const result = describeAuthError({ status: 429, code: 'over_email_send_rate_limit' }, 'register');
  assert.match(result.message, /inbox/);
  assert.match(result.message, /SMTP/);
  assert.equal(result.cooldown, true);
});
test('unconfirmed email has a specific safe instruction', () =>
  assert.match(
    describeAuthError({ code: 'email_not_confirmed' }, 'login').message,
    /Confirm your email/,
  ));
test('unknown provider details never reach UI', () => {
  const result = describeAuthError({ message: 'private user@example.com token' }, 'register');
  assert.equal(result.cooldown, undefined);
  assert.ok(!result.message.includes('private'));
});
