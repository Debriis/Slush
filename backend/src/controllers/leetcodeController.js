import { z } from 'zod';
import { leetcodeUsername, importInput } from '../integrations/leetcode/leetcodeNormalizer.js';
import { importSubmissions, leetcodeOverview } from '../integrations/leetcode/leetcodeService.js';
import { capabilities } from '../integrations/leetcode/leetcodeClient.js';
import { synchronize } from '../integrations/leetcode/leetcodeSync.js';
export function leetcodeController(db) {
  return {
    overview: async (req, res) =>
      res.json({ data: { ...(await leetcodeOverview(db, req.user.id)), capabilities } }),
    connect: async (req, res) => {
      const { username } = z.object({ username: leetcodeUsername }).strict().parse(req.body);
      const data = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user.id}))::text`;
        return tx.connectedAccount.upsert({
          where: { userId_provider: { userId: req.user.id, provider: 'leetcode' } },
          create: { userId: req.user.id, provider: 'leetcode', username },
          update: {
            username,
            verifiedAt: null,
            status: 'SELF_REPORTED',
            lastSyncAt: null,
            syncStatus: 'UNAVAILABLE',
          },
        });
      });
      res.json({ data });
    },
    disconnect: async (req, res) => {
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user.id}))::text`;
        await tx.connectedAccount.deleteMany({
          where: { userId: req.user.id, provider: 'leetcode' },
        });
      });
      res.json({ data: { disconnected: true, message: 'Imported history is retained.' } });
    },
    preview: async (req, res) =>
      res.json({ data: await importSubmissions(db, req.user.id, importInput.parse(req.body)) }),
    commit: async (req, res) =>
      res.json({
        data: await importSubmissions(db, req.user.id, importInput.parse(req.body), true),
      }),
    sync: async () => synchronize(),
  };
}
