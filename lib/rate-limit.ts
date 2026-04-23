import { prisma } from '@/lib/db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * Postgres-backed sliding-window rate limiter.
 *
 * Records a hit and checks how many hits occurred for the bucket within
 * the window. If the count (after recording) exceeds `limit`, returns
 * `allowed: false` and lets the caller decide how to respond.
 *
 * Buckets are namespaced strings — e.g. `roleplay:<userId>`, `signin:<ip>`.
 * A periodic cleanup (e.g. cron) can delete old RateLimitHit rows; we also
 * opportunistically prune stale rows for the requested bucket on each call.
 */
export async function checkRateLimit({
  bucket,
  limit,
  windowMs,
}: {
  bucket: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Opportunistic cleanup of rows outside the window for this bucket.
  await prisma.rateLimitHit.deleteMany({
    where: { bucket, createdAt: { lt: windowStart } },
  });

  const existing = await prisma.rateLimitHit.count({
    where: { bucket, createdAt: { gte: windowStart } },
  });

  if (existing >= limit) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { bucket, createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    const resetAt = new Date((oldest?.createdAt ?? now).getTime() + windowMs);
    return { allowed: false, remaining: 0, limit, resetAt };
  }

  await prisma.rateLimitHit.create({ data: { bucket } });

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing - 1),
    limit,
    resetAt: new Date(now.getTime() + windowMs),
  };
}

// Common limits
export const LIMITS = {
  ROLEPLAY_MESSAGES_PER_HOUR: 60,
  ROLEPLAY_SESSIONS_PER_DAY: 40,
  SIGNIN_ATTEMPTS_PER_HOUR: 20,
  QUIZ_ATTEMPTS_PER_HOUR: 60,
} as const;
