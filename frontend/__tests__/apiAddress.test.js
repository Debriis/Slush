import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiAddress } from '../src/config/apiAddress.js';
const lan = 'http://192.168.1.13:4000/api';
test('localhost web uses a stable loopback API instead of stale LAN IP', () =>
  assert.equal(
    resolveApiAddress(lan, { web: true, hostname: 'localhost' }),
    'http://localhost:4000/api',
  ));
test('physical device retains its configured LAN API', () =>
  assert.equal(resolveApiAddress(lan), lan));
test('production API is never rewritten', () =>
  assert.equal(
    resolveApiAddress('https://api.slush.example/api', { web: true, hostname: 'localhost' }),
    'https://api.slush.example/api',
  ));
test('LAN web access preserves configured API', () =>
  assert.equal(resolveApiAddress(lan, { web: true, hostname: '192.168.1.35' }), lan));
test('explicit web override wins only on web', () => {
  assert.equal(
    resolveApiAddress(lan, { web: true, override: 'http://localhost:5000/api' }),
    'http://localhost:5000/api',
  );
  assert.equal(resolveApiAddress(lan, { override: 'http://localhost:5000/api' }), lan);
});
