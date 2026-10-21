import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { canManage, clanMember } from '../src/services/permissions.js';
import { postInput, claimInput } from '../src/validators/index.js';
const config = { origins: ['http://localhost:8081'], reviewers: [] };
// These are isolated test doubles, never application data or seeded database records.
const denied = {
  auth: {
    getUser: async () => ({
      data: { user: null },
      error: new Error('private'),
    }),
  },
};
const app = createApp({ db: {}, supabase: denied, config });
test('health is available without credentials', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'ok');
});
test('missing auth is rejected before database access', async () => {
  const res = await request(app).get('/api/posts');
  assert.equal(res.status, 401);
});
test('forged bearer token is rejected and details redacted', async () => {
  const res = await request(app).get('/api/posts').set('Authorization', 'Bearer forged');
  assert.equal(res.status, 401);
  assert.ok(!JSON.stringify(res.body).includes('private'));
});
test('auth service outage returns a safe retryable error', async () => {
  const outage = createApp({
    db: {},
    config,
    supabase: {
      auth: {
        getUser: async () => {
          throw new Error('secret');
        },
      },
    },
  });
  const res = await request(outage).get('/api/me').set('Authorization', 'Bearer token');
  assert.equal(res.status, 503);
  assert.ok(!JSON.stringify(res.body).includes('secret'));
});
test('readiness fails when database unavailable', async () => {
  assert.equal((await request(app).get('/health/ready')).status, 503);
});
test('CORS does not grant arbitrary origins access', async () => {
  const res = await request(app).get('/health').set('Origin', 'https://untrusted.invalid');
  assert.equal(res.headers['access-control-allow-origin'], undefined);
});
test('unknown submitted XP/verification fields are rejected', () => {
  assert.equal(postInput.safeParse({ body: 'A genuine manual update', xp: 9000 }).success, false);
  assert.equal(claimInput.safeParse({ verified: true, xp: 100 }).success, false);
});
test('only owner and admin can manage clans', () => {
  assert.equal(canManage('OWNER'), true);
  assert.equal(canManage('ADMIN'), true);
  assert.equal(canManage('MEMBER'), false);
  assert.equal(canManage(undefined), false);
});
test('nonmember cannot access private clan operations', async () => {
  await assert.rejects(
    clanMember({ clanMembership: { findUnique: async () => null } }, 'clan', 'user'),
    { status: 403 },
  );
});
test('regular clan member cannot manage clan', async () => {
  await assert.rejects(
    clanMember(
      { clanMembership: { findUnique: async () => ({ role: 'MEMBER' }) } },
      'clan',
      'user',
      true,
    ),
    { status: 403 },
  );
});
