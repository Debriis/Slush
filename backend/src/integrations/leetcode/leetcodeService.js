import { normalizeImport } from './leetcodeNormalizer.js';
import { requireCondition } from '../../utils/errors.js';
import { localDay, calculateStreak } from '../../utils/scoring.js';
export function summarize(rows, timeZone, now = new Date()) {
  const problems = new Map(),
    calendar = new Map();
  for (const r of rows) {
    problems.set(r.problemId, r.difficulty);
    const day = localDay(r.occurredAt, timeZone);
    calendar.set(day, (calendar.get(day) || 0) + 1);
  }
  const days = [...calendar]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, solved]) => ({ day, solved }));
  return {
    total: problems.size,
    easy: [...problems.values()].filter((d) => d === 'EASY').length,
    medium: [...problems.values()].filter((d) => d === 'MEDIUM').length,
    hard: [...problems.values()].filter((d) => d === 'HARD').length,
    submissions: rows.length,
    days,
    timeZone,
    selfReported: true,
    ...calculateStreak(
      days.map((d) => d.day),
      localDay(now, timeZone),
    ),
  };
}
export async function importSubmissions(db, userId, input, commit = false) {
  const rows = normalizeImport(input);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`;
    const account = await tx.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider: 'leetcode' } },
    });
    requireCondition(
      account && account.username === input.username,
      409,
      'Connect this username before importing.',
    );
    const existing = await tx.importedSubmission.findMany({
      where: { userId, provider: 'leetcode', externalId: { in: rows.map((r) => r.externalId) } },
      select: { externalId: true },
    });
    const seen = new Set(existing.map((r) => r.externalId));
    const fresh = rows.filter((r) => {
      if (seen.has(r.externalId)) return false;
      seen.add(r.externalId);
      return true;
    });
    if (commit) {
      await tx.importedSubmission.createMany({
        data: fresh.map((r) => ({
          ...r,
          userId,
          username: account.username,
          provider: 'leetcode',
        })),
        skipDuplicates: true,
      });
      await tx.connectedAccount.update({
        where: { id: account.id },
        data: { lastImportedAt: new Date(), syncStatus: 'IMPORT_ONLY' },
      });
    }
    return {
      imported: commit ? fresh.length : 0,
      newCount: fresh.length,
      duplicates: rows.length - fresh.length,
      preview: fresh.slice(0, 20),
      selfReported: true,
    };
  });
}
export async function leetcodeOverview(db, userId) {
  const [account, profile, rows] = await Promise.all([
    db.connectedAccount.findUnique({
      where: { userId_provider: { userId, provider: 'leetcode' } },
    }),
    db.profile.findUniqueOrThrow({ where: { id: userId } }),
    db.importedSubmission.findMany({
      where: { userId, provider: 'leetcode' },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    }),
  ]);
  return { account, stats: summarize(rows, profile.timeZone), recent: rows.slice(0, 50) };
}
