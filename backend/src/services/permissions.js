import { ApiError } from '../utils/errors.js';
export function canManage(role) {
  return role === 'OWNER' || role === 'ADMIN';
}
export async function clanMember(db, clanId, userId, manage = false) {
  const membership = await db.clanMembership.findUnique({
    where: { clanId_userId: { clanId, userId } },
  });
  if (!membership || (manage && !canManage(membership.role)))
    throw new ApiError(403, 'You do not have access to this clan operation.');
  return membership;
}
export async function accessiblePost(db, postId, userId) {
  const post = await db.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(404, 'Post not found.');
  if (post.clanId) await clanMember(db, post.clanId, userId);
  return post;
}
