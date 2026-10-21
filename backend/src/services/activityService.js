import { calculateStreak, localDay, problemXp, levelProgress } from '../utils/scoring.js';
import { ApiError } from '../utils/errors.js';

export async function statistics(db, userId) {
  const [profile, days, xp, solved] = await Promise.all([
    db.profile.findUniqueOrThrow({ where: { id: userId } }),
    db.dailySummary.findMany({ where: { userId }, orderBy: { day: 'asc' } }),
    db.xpTransaction.aggregate({ where: { userId }, _sum: { amount: true } }),
    db.codingActivity.count({ where: { userId } }),
  ]);
  const totalXp = xp._sum.amount || 0;
  return {
    ...calculateStreak(
      days.map((d) => d.day),
      localDay(new Date(), profile.timeZone),
    ),
    totalXp,
    solved,
    ...levelProgress(totalXp),
    days: days.slice(-366),
    timeZone: profile.timeZone,
  };
}

// Called only after a configured trusted reviewer verifies genuine evidence.
// There is intentionally no public endpoint accepting verified activities or XP.
export async function reviewClaim(db, claimId, reviewerId, approve) {
  return db.$transaction(async (tx) => {
    const claim = await tx.activityClaim.findUniqueOrThrow({
      where: { id: claimId },
    });
    if (claim.status !== 'PENDING')
      throw new ApiError(409, 'This claim has already been reviewed.');
    if (claim.userId === reviewerId)
      throw new ApiError(403, 'You cannot review your own activity.');
    const changed = await tx.activityClaim.updateMany({
      where: { id: claimId, status: 'PENDING' },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        reviewerId,
        reviewedAt: new Date(),
      },
    });
    if (changed.count !== 1) throw new ApiError(409, 'This claim has already been reviewed.');
    if (!approve) return { status: 'REJECTED' };
    // Serialize awards for this user so summaries/streaks stay consistent under concurrency.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${claim.userId}))::text`;
    const user = await tx.profile.findUniqueOrThrow({
      where: { id: claim.userId },
    });
    const activity = await tx.codingActivity.create({
      data: {
        userId: claim.userId,
        provider: claim.provider,
        externalId: claim.id,
        problemId: claim.problemId,
        title: claim.title,
        difficulty: claim.difficulty,
        occurredAt: claim.occurredAt,
      },
    });
    const amount = problemXp(claim.difficulty);
    await tx.xpTransaction.create({
      data: {
        userId: user.id,
        activityId: activity.id,
        amount,
        occurredAt: activity.occurredAt,
      },
    });
    const day = localDay(activity.occurredAt, user.timeZone);
    await tx.dailySummary.upsert({
      where: { userId_day: { userId: user.id, day } },
      create: { userId: user.id, day, solved: 1, xp: amount },
      update: { solved: { increment: 1 }, xp: { increment: amount } },
    });
    const days = await tx.dailySummary.findMany({ where: { userId: user.id } });
    const streak = calculateStreak(
      days.map((d) => d.day),
      localDay(new Date(), user.timeZone),
    );
    await tx.streak.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...streak },
      update: streak,
    });
    const achievement = await tx.achievement.upsert({
      where: { code: 'FIRST_VERIFIED' },
      create: { code: 'FIRST_VERIFIED', title: 'First verified problem' },
      update: {},
    });
    await tx.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: user.id,
          achievementId: achievement.id,
        },
      },
      create: { userId: user.id, achievementId: achievement.id },
      update: {},
    });
    await tx.notification.create({
      data: {
        userId: user.id,
        body: `Your activity was verified: ${activity.title}. ${amount} XP earned.`,
      },
    });
    return activity;
  });
}
