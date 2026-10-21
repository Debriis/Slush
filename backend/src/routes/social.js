import { Router } from 'express';
import { z } from 'zod';
import { id, text, postInput, pageQuery, pageResult } from '../validators/index.js';
import { publicProfile } from './users.js';
import { accessiblePost, clanMember } from '../services/permissions.js';
import { requireCondition } from '../utils/errors.js';

export function socialRoutes(db) {
  const r = Router();
  r.get('/posts', async (req, res) => {
    const p = pageQuery(req.query);
    const scope = z
      .enum(['global', 'following', 'mine', 'clan'])
      .parse(req.query.scope || 'global');
    let where = { clanId: null };
    if (scope === 'following') where.author = { followers: { some: { followerId: req.user.id } } };
    if (scope === 'mine') where.authorId = req.user.id;
    if (scope === 'clan') {
      const clanId = id.parse(req.query.clanId);
      await clanMember(db, clanId, req.user.id);
      where = { clanId };
    }
    res.json({
      data: pageResult(
        await db.post.findMany({
          where,
          include: {
            author: { select: publicProfile },
            activity: true,
            _count: { select: { likes: true, comments: true } },
            likes: { where: { userId: req.user.id }, select: { userId: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/posts', async (req, res) => {
    const input = postInput.parse(req.body);
    if (input.clanId) await clanMember(db, input.clanId, req.user.id);
    if (input.activityId)
      requireCondition(
        !!(await db.codingActivity.findFirst({
          where: { id: input.activityId, userId: req.user.id },
        })),
        403,
        'Only your own verified achievements can be shared.',
      );
    res.status(201).json({
      data: await db.post.create({
        data: {
          ...input,
          authorId: req.user.id,
          kind: input.activityId ? 'ACHIEVEMENT' : 'MANUAL',
        },
      }),
    });
  });
  r.delete('/posts/:id', async (req, res) => {
    await db.post.deleteMany({
      where: { id: id.parse(req.params.id), authorId: req.user.id },
    });
    res.json({ data: { removed: true } });
  });
  r.put('/posts/:id/like', async (req, res) => {
    const postId = id.parse(req.params.id);
    await accessiblePost(db, postId, req.user.id);
    await db.like.upsert({
      where: { postId_userId: { postId, userId: req.user.id } },
      create: { postId, userId: req.user.id },
      update: {},
    });
    res.json({ data: { liked: true } });
  });
  r.delete('/posts/:id/like', async (req, res) => {
    const postId = id.parse(req.params.id);
    await accessiblePost(db, postId, req.user.id);
    await db.like.deleteMany({ where: { postId, userId: req.user.id } });
    res.json({ data: { liked: false } });
  });
  r.get('/posts/:id/comments', async (req, res) => {
    const postId = id.parse(req.params.id);
    await accessiblePost(db, postId, req.user.id);
    const p = pageQuery(req.query);
    res.json({
      data: pageResult(
        await db.comment.findMany({
          where: { postId },
          include: { author: { select: publicProfile } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: p.skip,
          take: p.take,
        }),
        p,
      ),
    });
  });
  r.post('/posts/:id/comments', async (req, res) => {
    const postId = id.parse(req.params.id);
    const post = await accessiblePost(db, postId, req.user.id);
    const { body } = z
      .object({ body: text(1000) })
      .strict()
      .parse(req.body);
    res.status(201).json({
      data: await db.$transaction(async (tx) => {
        const comment = await tx.comment.create({
          data: { postId, authorId: req.user.id, body },
        });
        if (post.authorId !== req.user.id)
          await tx.notification.create({
            data: {
              userId: post.authorId,
              body: 'A new comment was added to your post.',
            },
          });
        return comment;
      }),
    });
  });
  r.delete('/comments/:id', async (req, res) => {
    await db.comment.deleteMany({
      where: { id: id.parse(req.params.id), authorId: req.user.id },
    });
    res.json({ data: { removed: true } });
  });
  return r;
}
