export const XP_RULES = Object.freeze({ EASY: 10, MEDIUM: 25, HARD: 50 });
export function problemXp(difficulty) {
  if (!Object.hasOwn(XP_RULES, difficulty)) throw new Error('Invalid difficulty');
  return XP_RULES[difficulty];
}
export function localDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function previousDay(day) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
}
export function calculateStreak(days, today) {
  const sorted = [...new Set(days)].filter((day) => day <= today).sort();
  let longest = 0,
    run = 0,
    previous = null;
  for (const day of sorted) {
    run = previous === previousDay(day) ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }
  const active = new Set(sorted);
  let cursor = active.has(today) ? today : previousDay(today),
    current = 0;
  while (active.has(cursor)) {
    current++;
    cursor = previousDay(cursor);
  }
  return { current, longest, lastDay: sorted.at(-1) || null };
}
export function levelProgress(xp) {
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const floor = (level - 1) ** 2 * 100;
  const next = level ** 2 * 100;
  return { level, progress: (xp - floor) / (next - floor), nextLevelXp: next };
}
export function windowStart(period, now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === 'week') d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  else if (period === 'month') d.setUTCDate(1);
  else return new Date(0);
  return d;
}
