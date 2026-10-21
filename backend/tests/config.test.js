import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config.js';
const fixture = {
  DATABASE_URL: 'postgresql://config_test:not_a_real_password@db.invalid/postgres',
  DIRECT_URL: 'postgres://config_test:not_a_real_password@db.invalid/postgres',
  SUPABASE_URL: 'https://project-test.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_TEST_CONFIGURATION_ONLY',
  CORS_ORIGINS: 'http://localhost:8081',
};
test('backend accepts PostgreSQL URI variants and public publishable keys', () =>
  assert.equal(readConfig(fixture).PORT, 4000));
test('configuration failures list names without reflecting secret values', () => {
  assert.throws(
    () => readConfig({ ...fixture, DATABASE_URL: 'secret-invalid-database-value' }),
    (error) => error.fields.includes('DATABASE_URL') && !error.message.includes('secret-invalid'),
  );
});
test('private Supabase API keys cannot be configured as public keys', () =>
  assert.throws(
    () => readConfig({ ...fixture, SUPABASE_ANON_KEY: 'sb_secret_TEST_CONFIGURATION_ONLY' }),
    /SUPABASE_ANON_KEY/,
  ));
test('invalid CORS paths and reviewer identities are rejected', () => {
  assert.throws(
    () => readConfig({ ...fixture, CORS_ORIGINS: 'https://frontend.invalid/a/path' }),
    /CORS_ORIGINS/,
  );
  assert.throws(
    () => readConfig({ ...fixture, REVIEWER_USER_IDS: 'administrator' }),
    /REVIEWER_USER_IDS/,
  );
});
