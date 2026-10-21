import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStreak,
  localDay,
  problemXp,
  levelProgress,
  windowStart,
} from '../src/utils/scoring.js';

test('empty activity has zero streaks and no invented dates', () =>
  assert.deepEqual(calculateStreak([], '2026-01-01'), {
    current: 0,
    longest: 0,
    lastDay: null,
  }));
test('streak allows today to be incomplete; duplicates do not count', () =>
  assert.deepEqual(calculateStreak(['2026-01-01', '2026-01-02', '2026-01-02'], '2026-01-03'), {
    current: 2,
    longest: 2,
    lastDay: '2026-01-02',
  }));
test('gap breaks current streak while longest survives', () =>
  assert.deepEqual(calculateStreak(['2026-01-01', '2026-01-02'], '2026-01-04'), {
    current: 0,
    longest: 2,
    lastDay: '2026-01-02',
  }));
test('future activity excluded', () =>
  assert.equal(calculateStreak(['2026-01-04'], '2026-01-03').longest, 0));
test('streak crosses year and leap-day boundaries', () => {
  assert.equal(calculateStreak(['2025-12-31', '2026-01-01'], '2026-01-01').current, 2);
  assert.equal(
    calculateStreak(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01').current,
    3,
  );
});
test('UTC day and India day differ near midnight', () => {
  const d = new Date('2026-01-01T20:00:00Z');
  assert.equal(localDay(d, 'UTC'), '2026-01-01');
  assert.equal(localDay(d, 'Asia/Kolkata'), '2026-01-02');
});
test('DST dates follow calendar days rather than 24-hour durations', () => {
  assert.equal(localDay(new Date('2026-03-08T06:30:00Z'), 'America/New_York'), '2026-03-08');
  assert.equal(localDay(new Date('2026-03-09T04:30:00Z'), 'America/New_York'), '2026-03-09');
  assert.equal(
    localDay(new Date('2026-11-01T05:30:00Z'), 'America/New_York'),
    localDay(new Date('2026-11-01T06:30:00Z'), 'America/New_York'),
  );
});
test('XP rules are controlled and unsupported difficulty fails', () => {
  assert.equal(problemXp('EASY'), 10);
  assert.equal(problemXp('MEDIUM'), 25);
  assert.equal(problemXp('HARD'), 50);
  assert.throws(() => problemXp('99999'));
  assert.throws(() => problemXp('__proto__'));
});
test('level is derived from authoritative XP', () => {
  assert.equal(levelProgress(0).level, 1);
  assert.equal(levelProgress(100).level, 2);
  assert.equal(levelProgress(400).level, 3);
});
test('weekly and monthly score windows use UTC boundaries', () => {
  assert.equal(
    windowStart('week', new Date('2026-10-21T14:00Z')).toISOString(),
    '2026-10-19T00:00:00.000Z',
  );
  assert.equal(
    windowStart('month', new Date('2026-10-21T14:00Z')).toISOString(),
    '2026-10-01T00:00:00.000Z',
  );
});
