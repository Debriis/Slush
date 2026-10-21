import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { id, pageQuery, pageResult } from '../validators/index.js';
import { windowStart } from '../utils/scoring.js';
import { clanMember } from '../services/permissions.js';

export function leaderboardRoutes(db) {
  const r = Router();
  r.get('/leaderboards', async (req, res) => {
    const p = pageQuery(req.query);
    const scope = z.enum(['global', 'friends', 'clan']).parse(req.query.scope || 'global');
    const period = z.enum(['all', 'week', 'month']).parse(req.query.period || 'week');
    const metric = z.enum(['xp', 'solved']).parse(req.query.metric || 'xp');
    const start = windowStart(period);
    let filter = Prisma.empty;
    if (scope === 'friends')
      filter = Prisma.sql`AND (x."userId" = ${req.user.id}::uuid OR EXISTS (SELECT 1 FROM follows f WHERE f."followerId" = ${req.user.id}::uuid AND f."followingId" = x."userId"))`;
    if (scope === 'clan') {
      const clanId = id.parse(req.query.clanId);
      await clanMember(db, clanId, req.user.id);
      filter = Prisma.sql`AND EXISTS (SELECT 1 FROM clan_memberships m WHERE m."clanId" = ${clanId}::uuid AND m."userId" = x."userId" AND x."occurredAt" >= m."joinedAt")`;
    }
    const score = metric === 'xp' ? Prisma.sql`SUM(x.amount)` : Prisma.sql`COUNT(*)`;
    const rows = await db.$queryRaw(
      Prisma.sql`WITH scores AS (SELECT x."userId", ${score}::int AS score FROM xp_transactions x WHERE x."occurredAt" >= ${start} AND x."occurredAt" <= NOW() ${filter} GROUP BY x."userId"), ranked AS (SELECT *, RANK() OVER (ORDER BY score DESC)::int AS rank FROM scores) SELECT r.*, p.username, p."avatarUrl" FROM ranked r JOIN profiles p ON p.id = r."userId" ORDER BY r.rank, p.username, p.id LIMIT ${p.take} OFFSET ${p.skip}`,
    );
    res.json({
      data: {
        ...pageResult(rows, p),
        period,
        scope,
        metric,
        startsAt: start.toISOString(),
        clanXp: scope === 'clan' ? await clanXp(db, id.parse(req.query.clanId), start) : null,
      },
    });
  });
  return r;
}

async function clanXp(db, clanId, start) {
  const rows =
    await db.$queryRaw`SELECT COALESCE(SUM(x.amount),0)::int AS xp FROM xp_transactions x JOIN clan_memberships m ON m."userId"=x."userId" WHERE m."clanId"=${clanId}::uuid AND x."occurredAt">=m."joinedAt" AND x."occurredAt">=${start} AND x."occurredAt"<=NOW()`;
  return rows[0].xp;
}
