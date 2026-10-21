import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import {
  normalizeImport,
  leetcodeUsername,
} from '../src/integrations/leetcode/leetcodeNormalizer.js';
import { summarize, importSubmissions } from '../src/integrations/leetcode/leetcodeService.js';
import { fetchActivity } from '../src/integrations/leetcode/leetcodeClient.js';
const row = {
  externalId: 's1',
  problemId: '1',
  title: 'Example, test',
  difficulty: 'EASY',
  occurredAt: '2026-01-01T23:30:00Z',
  status: 'ACCEPTED',
};
const input = { format: 'json', content: JSON.stringify([row]), username: 'coder' };
function database() {
  const records = [];
  let account = null;
  const db = {
    $queryRaw: async () => [],
    profile: { findUniqueOrThrow: async () => ({ timeZone: 'Asia/Kolkata' }) },
    connectedAccount: {
      findUnique: async () => account,
      upsert: async ({ create, update }) =>
        (account = account ? { ...account, ...update } : { id: 'account', ...create }),
      update: async ({ data }) => (account = { ...account, ...data }),
      deleteMany: async () => {
        account = null;
      },
    },
    importedSubmission: {
      findMany: async () => records,
      createMany: async ({ data }) => {
        records.push(...data);
        return { count: data.length };
      },
    },
    $transaction: async (fn) => fn(db),
  };
  return { db, records };
}
const config = { origins: [], reviewers: [] };
const supabase = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) } };
test('strict usernames, accepted status, timestamps and verification fields', () => {
  for (const v of ['', 'bad name', 'https://leetcode.com/u/a', 'a'.repeat(31)])
    assert.equal(leetcodeUsername.safeParse(v).success, false);
  for (const override of [
    { status: 'WRONG_ANSWER' },
    { occurredAt: '2026-01-01' },
    { occurredAt: '2099-01-01T00:00:00Z' },
    { verified: true },
    { xp: 100 },
  ])
    assert.throws(() =>
      normalizeImport({ ...input, content: JSON.stringify([{ ...row, ...override }]) }),
    );
  assert.equal(
    normalizeImport(input)[0].occurredAt.toISOString(),
    row.occurredAt.replace('Z', '.000Z'),
  );
});
test('CSV quoting, BOM, malformed rows and bounds', () => {
  const csv =
    'externalId,problemId,title,difficulty,occurredAt,status\r\ns1,1,"Example, test",EASY,2026-01-01T23:30:00Z,ACCEPTED\r\n';
  assert.equal(
    normalizeImport({ ...input, format: 'csv', content: '\uFEFF' + csv })[0].title,
    row.title,
  );
  for (const content of ['{', '[]', JSON.stringify(Array(1001).fill(row))])
    assert.throws(() => normalizeImport({ ...input, content }));
  assert.throws(() => normalizeImport({ ...input, format: 'csv', content: csv + '"unclosed' }));
});
test('timezone boundary, distinct problems, repeat submissions and streak gaps', () => {
  const rows = normalizeImport(input);
  const stats = summarize(
    [...rows, { ...rows[0], externalId: 's2', occurredAt: new Date('2026-01-02T23:30:00Z') }],
    'Asia/Kolkata',
    new Date('2026-01-03T09:00:00Z'),
  );
  assert.equal(stats.total, 1);
  assert.equal(stats.submissions, 2);
  assert.equal(stats.current, 2);
  assert.equal(stats.longest, 2);
  assert.equal(stats.days[0].day, '2026-01-02');
  assert.equal(summarize(rows, 'UTC', new Date('2026-01-04')).current, 0);
});
test('preview does not persist; commit deduplicates and never writes XP', async () => {
  const { db, records } = database();
  await db.connectedAccount.upsert({ create: { username: 'coder' } });
  assert.equal((await importSubmissions(db, 'owner', input)).newCount, 1);
  assert.equal(records.length, 0);
  assert.equal(
    (await importSubmissions(db, 'owner', { ...input, content: JSON.stringify([row, row]) }, true))
      .duplicates,
    1,
  );
  assert.equal(records.length, 1);
  assert.equal((await importSubmissions(db, 'owner', input, true)).imported, 0);
  await assert.rejects(importSubmissions(db, 'owner', { ...input, username: 'other' }, true), {
    status: 409,
  });
});
test('authenticated account lifecycle, disabled API, import persistence and rate limit', async () => {
  const { db, records } = database();
  const app = createApp({ db, supabase, config });
  assert.equal((await request(app).get('/api/leetcode')).status, 401);
  const call = (method, path) =>
    request(app)
      [method]('/api/leetcode' + path)
      .set('Authorization', 'Bearer valid');
  assert.equal((await call('put', '/account').send({ username: 'bad name' })).status, 400);
  assert.equal((await call('put', '/account').send({ username: 'coder' })).status, 200);
  assert.equal((await call('post', '/sync').send({})).status, 409);
  assert.equal((await call('post', '/import/preview').send(input)).body.data.newCount, 1);
  assert.equal(records.length, 0);
  assert.equal((await call('post', '/import').send(input)).body.data.imported, 1);
  assert.equal((await call('get', '')).body.data.stats.total, 1);
  assert.equal((await call('delete', '/account')).status, 200);
  assert.equal(records.length, 1);
  let res;
  for (let i = 0; i < 21; i++) res = await call('get', '');
  assert.equal(res.status, 429);
});
test('automatic client fails closed', async () => {
  await assert.rejects(fetchActivity(), { status: 409 });
});
