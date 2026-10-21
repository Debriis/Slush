import { leetcodeController } from '../controllers/leetcodeController.js';
import { Router } from 'express';
import { z } from 'zod';
import {
  id,
  username,
  profileInput,
  pageQuery,
  pageResult,
  claimInput,
} from '../validators/index.js';
import { statistics, reviewClaim } from '../services/activityService.js';
import { requireCondition } from '../utils/errors.js';
import { provisionProfile } from '../controllers/profileController.js';

export const publicProfile = {
  id: true,
  username: true,
  bio: true,
  avatarUrl: true,
  createdAt: true,
};

export function userRoutes(db, config) {
  const r = Router();
  r.post('/me', async (req, res) => {
    const input = z
      .object({
        username: username.optional(),
        timeZone: profileInput.shape.timeZone,
      })
      .strict()
      .parse(req.body);
    const profile = await provisionProfile(db, req.user, input);
    res.json({ data: profile });
  });
  r.get('/me', async (req, res) => {
    res.json({
      data: {
        ...(await db.profile.findUniqueOrThrow({
          where: { id: req.user.id },
          include: { accounts: true },
        })),
        isReviewer: config.reviewers.includes(req.user.id),
      },
    });
  });
  r.patch('/me', async (req, res) => {
    const input = profileInput.parse(req.body);
    res.json({
      data: await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${req.user.id}))::text`;
        const profile = await tx.profile.findUniqueOrThrow({ where: { id: req.user.id } });
        if (input.timeZone && input.timeZone !== profile.timeZone)
          requireCondition(
            (await tx.codingActivity.count({ where: { userId: req.user.id } })) === 0,
            409,
            'Time zone changes after verified activity require administrator review.',
          );
        return tx.profile.update({ where: { id: req.user.id }, data: input });
      }),
    });
  });
  r.get('/users', async (req, res) => {
    const p = pageQuery(req.query);
    const search = z
      .string()
      .max(100)
      .parse(req.query.search || '');
    res.json({
      data: pageResult(
        await db.profile.findMany({
          where: { username: { contains: search, mode: 'insensitive' } },
          select: publicProfile,
          orderBy: [{ username: 'asc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.get('/users/:id', async (req, res) => {
    const userId = id.parse(req.params.id);
    const profile = await db.profile.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...publicProfile,
        _count: { select: { followers: true, follows: true } },
        accounts: {
          select: { provider: true, username: true, verifiedAt: true },
        },
        achievements: { include: { achievement: true } },
      },
    });
    const following = await db.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: req.user.id,
          followingId: userId,
        },
      },
    });
    res.json({
      data: {
        ...profile,
        following: !!following,
        stats: await statistics(db, userId),
      },
    });
  });
  r.get('/users/:id/stats', async (req, res) =>
    res.json({ data: await statistics(db, id.parse(req.params.id)) }),
  );
  r.put('/users/:id/follow', async (req, res) => {
    const target = id.parse(req.params.id);
    requireCondition(target !== req.user.id, 400, 'You cannot follow yourself.');
    await db.$transaction(async (tx) => {
      const exists = await tx.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: req.user.id,
            followingId: target,
          },
        },
      });
      if (!exists) {
        await tx.follow.create({
          data: { followerId: req.user.id, followingId: target },
        });
        await tx.notification.create({
          data: {
            userId: target,
            body: 'Someone started following you. Visit your followers to connect.',
          },
        });
      }
    });
    res.json({ data: { following: true } });
  });
  r.delete('/users/:id/follow', async (req, res) => {
    await db.follow.deleteMany({
      where: { followerId: req.user.id, followingId: id.parse(req.params.id) },
    });
    res.json({ data: { following: false } });
  });
  r.get('/me/connections', async (req, res) => {
    const p = pageQuery(req.query);
    const kind = z.enum(['followers', 'following', 'friends']).parse(req.query.kind || 'following');
    const where =
      kind === 'followers'
        ? { follows: { some: { followingId: req.user.id } } }
        : kind === 'friends'
          ? {
              followers: { some: { followerId: req.user.id } },
              follows: { some: { followingId: req.user.id } },
            }
          : { followers: { some: { followerId: req.user.id } } };
    res.json({
      data: pageResult(
        await db.profile.findMany({
          where,
          select: publicProfile,
          orderBy: { username: 'asc' },
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.get('/activity', async (req, res) => {
    const p = pageQuery(req.query);
    const userId = req.query.userId ? id.parse(req.query.userId) : req.user.id;
    res.json({
      data: pageResult(
        await db.codingActivity.findMany({
          where: { userId },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.get('/me/xp', async (req, res) => {
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.xpTransaction.findMany({
          where: { userId: req.user.id },
          include: { activity: true },
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.get('/platforms', (_req, res) =>
    res.json({
      data: [
        {
          provider: 'leetcode',
          automaticSync: false,
          ownershipVerification: false,
          message:
            'Automatic synchronization is unavailable. A username is self-reported. Submit legitimate evidence for independent review; no XP is awarded until approval.',
        },
        {
          provider: 'codeforces',
          automaticSync: false,
          ownershipVerification: false,
          message: 'Adapter not enabled.',
        },
        {
          provider: 'github',
          automaticSync: false,
          ownershipVerification: false,
          message: 'Adapter not enabled.',
        },
      ],
    }),
  );
  r.put('/me/accounts/:provider', async (req, res) => {
    if (req.params.provider === 'leetcode') return leetcodeController(db).connect(req, res);
    const provider = z.enum(['leetcode', 'codeforces', 'github']).parse(req.params.provider);
    const input = z
      .object({
        username: z
          .string()
          .trim()
          .regex(/^[a-zA-Z0-9_-]{1,60}$/),
      })
      .strict()
      .parse(req.body);
    res.json({
      data: await db.connectedAccount.upsert({
        where: { userId_provider: { userId: req.user.id, provider } },
        create: { userId: req.user.id, provider, ...input },
        update: { ...input, verifiedAt: null },
      }),
    });
  });
  r.delete('/me/accounts/:provider', async (req, res) => {
    if (req.params.provider === 'leetcode') return leetcodeController(db).disconnect(req, res);
    await db.connectedAccount.deleteMany({
      where: {
        userId: req.user.id,
        provider: z.enum(['leetcode', 'codeforces', 'github']).parse(req.params.provider),
      },
    });
    res.json({ data: { removed: true } });
  });
  r.post('/activity/claims', async (req, res) => {
    requireCondition(
      config.reviewers.length > 0,
      503,
      'Evidence review is not configured yet. You can still share a manual post without XP.',
    );
    res.status(201).json({
      data: await db.activityClaim.create({
        data: { userId: req.user.id, ...claimInput.parse(req.body) },
      }),
    });
  });
  r.get('/activity/claims', async (req, res) => {
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.activityClaim.findMany({
          where: { userId: req.user.id },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.get('/admin/claims', async (req, res) => {
    requireCondition(config.reviewers.includes(req.user.id), 403, 'Reviewer access required.');
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.activityClaim.findMany({
          where: { status: 'PENDING' },
          include: { user: { select: publicProfile } },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/admin/claims/:id/review', async (req, res) => {
    requireCondition(config.reviewers.includes(req.user.id), 403, 'Reviewer access required.');
    const { approve } = z.object({ approve: z.boolean() }).strict().parse(req.body);
    res.json({
      data: await reviewClaim(db, id.parse(req.params.id), req.user.id, approve),
    });
  });
  r.get('/notifications', async (req, res) => {
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.notification.findMany({
          where: { userId: req.user.id },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.patch('/notifications/:id', async (req, res) => {
    await db.notification.updateMany({
      where: { id: id.parse(req.params.id), userId: req.user.id },
      data: { readAt: new Date() },
    });
    res.json({ data: { read: true } });
  });
  return r;
}
