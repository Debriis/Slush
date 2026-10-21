import { username } from '../validators/index.js';
export async function provisionProfile(db, user, input) {
  const fallback = `coder_${user.id.replaceAll('-', '').slice(0, 16)}`;
  const requested = username.safeParse(input.username || user.user_metadata?.username);
  const create = {
    id: user.id,
    username: requested.success ? requested.data : fallback,
    timeZone: input.timeZone || 'UTC',
  };
  try {
    return await db.profile.upsert({ where: { id: user.id }, create, update: {} });
  } catch (error) {
    if (error.code !== 'P2002') throw error;
    // A simultaneous username registration must not strand a real auth account.
    return db.profile.upsert({
      where: { id: user.id },
      create: { ...create, username: fallback },
      update: {},
    });
  }
}
