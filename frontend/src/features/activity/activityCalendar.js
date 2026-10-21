export function activityCalendar(stats, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: stats.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  const start = Date.parse(`${today}T00:00:00Z`);
  const days = Array.from({ length: 91 }, (_, i) =>
    new Date(start - (90 - i) * 86400000).toISOString().slice(0, 10),
  );
  const lookup = new Map(stats.days.map((d) => [d.day, d.solved]));
  const weeks = Array.from({ length: 13 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  return { days, lookup, weeks };
}
