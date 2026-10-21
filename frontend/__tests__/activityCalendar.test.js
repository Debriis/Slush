import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityCalendar } from '../src/features/activity/activityCalendar.js';
test('heatmap has 13 complete weeks, counts and correct local today across year boundary', () => {
  const c = activityCalendar(
    { timeZone: 'Asia/Kolkata', days: [{ day: '2026-01-01', solved: 3 }], selfReported: true },
    new Date('2025-12-31T23:30:00Z'),
  );
  assert.equal(c.days.length, 91);
  assert.equal(c.weeks.length, 13);
  assert.ok(c.weeks.every((w) => w.length === 7));
  assert.equal(c.days.at(-1), '2026-01-01');
  assert.equal(c.lookup.get('2026-01-01'), 3);
  assert.equal(new Set(c.days).size, 91);
});
test('heatmap uses consecutive calendar days across DST with empty cells left empty', () => {
  const c = activityCalendar(
    { timeZone: 'America/New_York', days: [] },
    new Date('2026-03-09T01:00:00Z'),
  );
  assert.equal(c.days.at(-1), '2026-03-08');
  assert.equal(c.days.at(-2), '2026-03-07');
  assert.equal(c.lookup.size, 0);
});
