import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { reviewClaim } from '../src/services/activityService.js';
import { getPlatform, registerPlatform } from '../src/services/platformRegistry.js';
const userId = '68c36906-7455-4dca-8bf7-cbc4ce683deb',
  clanId = 'b8dc679a-855a-419b-a1fd-9c1d9c40401b',
  postId = '59e1e32f-6871-4e16-8f5e-82490103d82c';
const supabase = { auth: { getUser: async () => ({ data: { user: { id: userId } } }) } };
const config = { origins: [], reviewers: [] };
test('authenticated request cannot forge XP in a post', async () => {
  const app = createApp({ db: {}, supabase, config });
  const result = await request(app)
    .post('/api/posts')
    .set('Authorization', 'Bearer test-token')
    .send({ body: 'Progress', xp: 50 });
  assert.equal(result.status, 400);
});
test('clan message endpoint rejects a nonmember before creating data', async () => {
  const app = createApp({
    supabase,
    config,
    db: {
      $transaction: async (fn) =>
        fn({ $queryRaw: async () => [], clanMembership: { findUnique: async () => null } }),
    },
  });
  const result = await request(app)
    .post(`/api/clans/${clanId}/messages`)
    .set('Authorization', 'Bearer test-token')
    .send({ body: 'Hello' });
  assert.equal(result.status, 403);
});
test('private clan post cannot be liked by nonmember', async () => {
  const app = createApp({
    supabase,
    config,
    db: {
      post: { findUnique: async () => ({ clanId }) },
      clanMembership: { findUnique: async () => null },
    },
  });
  const result = await request(app)
    .put(`/api/posts/${postId}/like`)
    .set('Authorization', 'Bearer test-token');
  assert.equal(result.status, 403);
});
test('normal user cannot reach reviewer queue', async () => {
  const app = createApp({ db: {}, supabase, config });
  assert.equal(
    (await request(app).get('/api/admin/claims').set('Authorization', 'Bearer test-token')).status,
    403,
  );
});
test('evidence submission is explicitly unavailable without reviewers', async () => {
  const app = createApp({ db: {}, supabase, config });
  assert.equal(
    (
      await request(app)
        .post('/api/activity/claims')
        .set('Authorization', 'Bearer test-token')
        .send({})
    ).status,
    503,
  );
});
test('review service rejects self-review before any write', async () => {
  const db = {
    $transaction: (fn) =>
      fn({ activityClaim: { findUniqueOrThrow: async () => ({ userId, status: 'PENDING' }) } }),
  };
  await assert.rejects(reviewClaim(db, 'claim', userId, true), { status: 403 });
});
test('review service rejects an already processed claim', async () => {
  const db = {
    $transaction: (fn) =>
      fn({ activityClaim: { findUniqueOrThrow: async () => ({ userId, status: 'APPROVED' }) } }),
  };
  await assert.rejects(reviewClaim(db, 'claim', 'reviewer', true), { status: 409 });
});
test('unauthorized platform adapters are disabled', () => {
  assert.equal(getPlatform('leetcode'), null);
  assert.throws(() => registerPlatform('leetcode', { authorized: false }));
});
