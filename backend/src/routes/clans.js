import { Router } from 'express';
import { z } from 'zod';
import { id, text, clanInput, pageQuery, pageResult } from '../validators/index.js';
import { publicProfile } from './users.js';
import { clanMember } from '../services/permissions.js';
import { requireCondition } from '../utils/errors.js';

async function lockedClan(db, clanId, operation) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${clanId}))::text`;
    return operation(tx);
  });
}
export function clanRoutes(db) {
  const r = Router();
  r.get('/clans', async (req, res) => {
    const p = pageQuery(req.query);
    const search = z
      .string()
      .max(100)
      .parse(req.query.search || '');
    const where = {
      name: { contains: search, mode: 'insensitive' },
      ...(req.query.mine === 'true' ? { memberships: { some: { userId: req.user.id } } } : {}),
    };
    res.json({
      data: pageResult(
        await db.clan.findMany({
          where,
          include: {
            _count: { select: { memberships: true } },
            memberships: { where: { userId: req.user.id } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/clans', async (req, res) => {
    const input = clanInput.parse(req.body);
    res.status(201).json({
      data: await db.clan.create({
        data: {
          ...input,
          memberships: { create: { userId: req.user.id, role: 'OWNER' } },
        },
      }),
    });
  });
  r.get('/clans/:id', async (req, res) => {
    const clanId = id.parse(req.params.id);
    const clan = await db.clan.findUniqueOrThrow({
      where: { id: clanId },
      include: {
        _count: { select: { memberships: true } },
        memberships: { where: { userId: req.user.id } },
      },
    });
    if (clan.private) await clanMember(db, clanId, req.user.id);
    res.json({ data: clan });
  });
  r.patch('/clans/:id', async (req, res) => {
    const clanId = id.parse(req.params.id);
    const input = clanInput.partial().parse(req.body);
    res.json({
      data: await lockedClan(db, clanId, async (tx) => {
        await clanMember(tx, clanId, req.user.id, true);
        return tx.clan.update({ where: { id: clanId }, data: input });
      }),
    });
  });
  r.post('/clans/:id/join', async (req, res) => {
    const clanId = id.parse(req.params.id);
    res.json({
      data: await lockedClan(db, clanId, async (tx) => {
        const clan = await tx.clan.findUniqueOrThrow({ where: { id: clanId } });
        if (clan.private)
          return tx.joinRequest.upsert({
            where: { clanId_userId: { clanId, userId: req.user.id } },
            create: { clanId, userId: req.user.id },
            update: {},
          });
        return tx.clanMembership.upsert({
          where: { clanId_userId: { clanId, userId: req.user.id } },
          create: { clanId, userId: req.user.id },
          update: {},
        });
      }),
    });
  });
  r.delete('/clans/:id/membership', async (req, res) => {
    const clanId = id.parse(req.params.id);
    await lockedClan(db, clanId, async (tx) => {
      const member = await clanMember(tx, clanId, req.user.id);
      if (member.role === 'OWNER') {
        const count = await tx.clanMembership.count({ where: { clanId } });
        requireCondition(count === 1, 409, 'Transfer ownership before leaving this clan.');
        await tx.clan.delete({ where: { id: clanId } });
      } else
        await tx.clanMembership.delete({
          where: { clanId_userId: { clanId, userId: req.user.id } },
        });
    });
    res.json({ data: { left: true } });
  });
  r.get('/clans/:id/members', async (req, res) => {
    const clanId = id.parse(req.params.id);
    await clanMember(db, clanId, req.user.id);
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.clanMembership.findMany({
          where: { clanId },
          include: { user: { select: publicProfile } },
          orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.patch('/clans/:id/members/:userId', async (req, res) => {
    const clanId = id.parse(req.params.id),
      userId = id.parse(req.params.userId);
    const { role } = z
      .object({ role: z.enum(['ADMIN', 'MEMBER', 'OWNER']) })
      .strict()
      .parse(req.body);
    await lockedClan(db, clanId, async (tx) => {
      const actor = await clanMember(tx, clanId, req.user.id);
      requireCondition(
        actor.role === 'OWNER' && userId !== req.user.id,
        403,
        'Only the owner can change another member’s role.',
      );
      const member = await clanMember(tx, clanId, userId);
      requireCondition(member.role !== 'OWNER', 400, 'The owner cannot be demoted directly.');
      if (role === 'OWNER')
        await tx.clanMembership.update({
          where: { clanId_userId: { clanId, userId: req.user.id } },
          data: { role: 'ADMIN' },
        });
      await tx.clanMembership.update({
        where: { clanId_userId: { clanId, userId } },
        data: { role },
      });
    });
    res.json({ data: { updated: true } });
  });
  r.delete('/clans/:id/members/:userId', async (req, res) => {
    const clanId = id.parse(req.params.id),
      userId = id.parse(req.params.userId);
    await lockedClan(db, clanId, async (tx) => {
      const actor = await clanMember(tx, clanId, req.user.id, true);
      const target = await clanMember(tx, clanId, userId);
      requireCondition(
        userId !== req.user.id &&
          target.role !== 'OWNER' &&
          (actor.role === 'OWNER' || target.role === 'MEMBER'),
        403,
        'You cannot remove this member.',
      );
      await tx.clanMembership.delete({
        where: { clanId_userId: { clanId, userId } },
      });
    });
    res.json({ data: { removed: true } });
  });
  r.get('/clans/:id/requests', async (req, res) => {
    const clanId = id.parse(req.params.id);
    await clanMember(db, clanId, req.user.id, true);
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.joinRequest.findMany({
          where: { clanId },
          include: { user: { select: publicProfile } },
          orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/clans/:id/requests/:userId', async (req, res) => {
    const clanId = id.parse(req.params.id),
      userId = id.parse(req.params.userId);
    const { approve } = z.object({ approve: z.boolean() }).strict().parse(req.body);
    await lockedClan(db, clanId, async (tx) => {
      await clanMember(tx, clanId, req.user.id, true);
      await tx.joinRequest.delete({
        where: { clanId_userId: { clanId, userId } },
      });
      if (approve)
        await tx.clanMembership.upsert({
          where: { clanId_userId: { clanId, userId } },
          create: { clanId, userId },
          update: {},
        });
      await tx.notification.create({
        data: {
          userId,
          body: approve
            ? 'Your clan join request was approved.'
            : 'Your clan join request was declined.',
        },
      });
    });
    res.json({ data: { approved: approve } });
  });
  r.get('/clans/:id/messages', async (req, res) => {
    const clanId = id.parse(req.params.id);
    await clanMember(db, clanId, req.user.id);
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.chatMessage.findMany({
          where: { clanId },
          include: { author: { select: publicProfile } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/clans/:id/messages', async (req, res) => {
    const clanId = id.parse(req.params.id);
    const { body } = z
      .object({ body: text(2000) })
      .strict()
      .parse(req.body);
    res.status(201).json({
      data: await lockedClan(db, clanId, async (tx) => {
        await clanMember(tx, clanId, req.user.id);
        return tx.chatMessage.create({
          data: { clanId, authorId: req.user.id, body },
        });
      }),
    });
  });
  r.get('/clans/:id/challenges', async (req, res) => {
    const clanId = id.parse(req.params.id);
    await clanMember(db, clanId, req.user.id);
    const p = pageQuery(req.query);
    const records = await db.challenge.findMany({
      where: { clanId },
      include: {
        participants: { where: { userId: req.user.id } },
        _count: { select: { participants: true } },
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
      skip: p.skip,
      take: p.take,
    });
    const items = await Promise.all(
      records.map(async (c) => ({
        ...c,
        progress: c.participants.length
          ? await db.codingActivity.count({
              where: {
                userId: req.user.id,
                occurredAt: {
                  gte: new Date(
                    Math.max(c.startsAt.getTime(), c.participants[0].joinedAt.getTime()),
                  ),
                  lt: c.endsAt,
                },
              },
            })
          : 0,
      })),
    );
    res.json({ data: pageResult(items, p) });
  });
  r.post('/clans/:id/challenges', async (req, res) => {
    const clanId = id.parse(req.params.id);
    const input = z
      .object({
        title: text(100),
        target: z.number().int().min(1).max(10000),
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
      })
      .strict()
      .refine(
        (v) =>
          new Date(v.endsAt) > new Date(v.startsAt) &&
          new Date(v.startsAt) >= new Date(Date.now() - 60000),
        'Choose a future challenge window.',
      )
      .parse(req.body);
    await clanMember(db, clanId, req.user.id, true);
    res.status(201).json({
      data: await db.challenge.create({ data: { clanId, ...input } }),
    });
  });
  r.post('/challenges/:id/join', async (req, res) => {
    const challengeId = id.parse(req.params.id);
    const challenge = await db.challenge.findUniqueOrThrow({
      where: { id: challengeId },
    });
    await clanMember(db, challenge.clanId, req.user.id);
    requireCondition(challenge.endsAt > new Date(), 409, 'This challenge has ended.');
    res.json({
      data: await db.challengeParticipation.upsert({
        where: { challengeId_userId: { challengeId, userId: req.user.id } },
        create: { challengeId, userId: req.user.id },
        update: {},
      }),
    });
  });
  return r;
}
