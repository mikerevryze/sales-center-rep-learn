import { Prisma, RoleplayStatus, type PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ============================================
// Achievement catalog
// ============================================

export type AchievementSlug =
  | 'MODULE_1_COMPLETE'
  | 'MODULE_2_COMPLETE'
  | 'MODULE_3_COMPLETE'
  | 'MODULE_4_COMPLETE'
  | 'MODULE_5_COMPLETE'
  | 'MODULE_6_COMPLETE'
  | 'MODULE_7_COMPLETE'
  | 'MODULE_8_COMPLETE'
  | 'MODULE_9_COMPLETE'
  | 'FIRST_CLOSE'
  | 'DRIVE_MASTERY'
  | 'OBJECTION_SLAYER'
  | 'ARCHETYPE_COLLECTOR'
  | 'PERFECTIONIST'
  | 'SPEED_TO_LEAD'
  | 'CERTIFIED_REP'
  | 'STREAK_7'
  | 'STREAK_30';

export interface AchievementDef {
  slug: AchievementSlug;
  title: string;
  description: string;
  icon: string; // lucide icon name
}

export const ACHIEVEMENTS: Record<AchievementSlug, AchievementDef> = {
  MODULE_1_COMPLETE: {
    slug: 'MODULE_1_COMPLETE',
    title: 'Business & Your Role',
    description: 'Completed Module 1.',
    icon: 'Briefcase',
  },
  MODULE_2_COMPLETE: {
    slug: 'MODULE_2_COMPLETE',
    title: 'Daily Rhythm',
    description: 'Completed Module 2.',
    icon: 'Clock',
  },
  MODULE_3_COMPLETE: {
    slug: 'MODULE_3_COMPLETE',
    title: 'Product Knowledge',
    description: 'Completed Module 3.',
    icon: 'BookOpen',
  },
  MODULE_4_COMPLETE: {
    slug: 'MODULE_4_COMPLETE',
    title: 'DRIVE Certified',
    description: 'Completed Module 4 — the DRIVE framework.',
    icon: 'Target',
  },
  MODULE_5_COMPLETE: {
    slug: 'MODULE_5_COMPLETE',
    title: 'Pattern Master',
    description: 'Completed Module 5.',
    icon: 'Zap',
  },
  MODULE_6_COMPLETE: {
    slug: 'MODULE_6_COMPLETE',
    title: 'Objection Slayer',
    description: 'Completed Module 6.',
    icon: 'Shield',
  },
  MODULE_7_COMPLETE: {
    slug: 'MODULE_7_COMPLETE',
    title: 'GHL Power-User',
    description: 'Completed Module 7.',
    icon: 'Settings',
  },
  MODULE_8_COMPLETE: {
    slug: 'MODULE_8_COMPLETE',
    title: 'Book of Business',
    description: 'Completed Module 8.',
    icon: 'Users',
  },
  MODULE_9_COMPLETE: {
    slug: 'MODULE_9_COMPLETE',
    title: 'Cert Complete',
    description: 'Completed Module 9 — the final certification module.',
    icon: 'GraduationCap',
  },
  FIRST_CLOSE: {
    slug: 'FIRST_CLOSE',
    title: 'First Close',
    description: 'Won your first roleplay session.',
    icon: 'Trophy',
  },
  DRIVE_MASTERY: {
    slug: 'DRIVE_MASTERY',
    title: 'DRIVE Mastery',
    description: 'Passed all 5 DRIVE steps in a single roleplay session.',
    icon: 'Star',
  },
  OBJECTION_SLAYER: {
    slug: 'OBJECTION_SLAYER',
    title: 'Objection Slayer',
    description: 'Won 10 roleplay sessions.',
    icon: 'Swords',
  },
  ARCHETYPE_COLLECTOR: {
    slug: 'ARCHETYPE_COLLECTOR',
    title: 'Archetype Collector',
    description: 'Won against all 11 archetypes at least once.',
    icon: 'Library',
  },
  PERFECTIONIST: {
    slug: 'PERFECTIONIST',
    title: 'Perfectionist',
    description: 'Scored 100% on a module quiz.',
    icon: 'CheckCircle',
  },
  SPEED_TO_LEAD: {
    slug: 'SPEED_TO_LEAD',
    title: 'Speed to Lead',
    description: 'Completed a module within 24 hours of starting.',
    icon: 'Rocket',
  },
  CERTIFIED_REP: {
    slug: 'CERTIFIED_REP',
    title: 'Certified Revryze Rep',
    description: 'Completed all 9 modules and won 3 roleplay sessions.',
    icon: 'Award',
  },
  STREAK_7: {
    slug: 'STREAK_7',
    title: '7-Day Streak',
    description: 'Logged in 7 consecutive days.',
    icon: 'Flame',
  },
  STREAK_30: {
    slug: 'STREAK_30',
    title: '30-Day Streak',
    description: 'Logged in 30 consecutive days.',
    icon: 'Flame',
  },
};

export const ACHIEVEMENT_LIST: AchievementDef[] = Object.values(ACHIEVEMENTS);

// ============================================
// Award helpers
// ============================================

interface AwardOpts {
  db?: Pick<PrismaClient, 'achievement'>;
}

/**
 * Idempotent award. Returns `null` if the user already has the achievement,
 * otherwise returns the newly-created achievement row.
 */
async function awardOnce(
  userId: string,
  slug: AchievementSlug,
  metadata?: Record<string, unknown>,
  opts?: AwardOpts,
) {
  const db = opts?.db ?? defaultPrisma;
  try {
    return await db.achievement.create({
      data: {
        userId,
        slug,
        metadataJson: (metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Unique constraint violation = already earned. Any other error bubbles.
    const message = (err as Error).message ?? '';
    if (message.includes('Unique') || message.includes('P2002')) return null;
    throw err;
  }
}

export async function awardSafely(
  userId: string,
  slug: AchievementSlug,
  metadata?: Record<string, unknown>,
) {
  try {
    return await awardOnce(userId, slug, metadata);
  } catch (err) {
    logger.error('achievement.award.failed', {
      userId,
      slug,
      err: (err as Error).message,
    });
    return null;
  }
}

// ============================================
// Event handlers — call these from the code paths that trigger them.
// Each handler is idempotent and safe to call repeatedly.
// ============================================

export async function onModuleCompleted(params: {
  userId: string;
  moduleOrderIndex: number;
  startedAt: Date;
  completedAt: Date;
  quizScore: number | null;
  totalQuestions: number | null;
}) {
  const { userId, moduleOrderIndex, startedAt, completedAt, quizScore, totalQuestions } = params;
  const newly: AchievementSlug[] = [];

  const moduleSlug = `MODULE_${moduleOrderIndex}_COMPLETE` as AchievementSlug;
  if (moduleSlug in ACHIEVEMENTS) {
    const a = await awardSafely(userId, moduleSlug, { moduleOrderIndex });
    if (a) newly.push(moduleSlug);
  }

  // SPEED_TO_LEAD — completed within 24h of starting.
  if (completedAt.getTime() - startedAt.getTime() <= 24 * 60 * 60 * 1000) {
    const a = await awardSafely(userId, 'SPEED_TO_LEAD', {
      moduleOrderIndex,
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
    });
    if (a) newly.push('SPEED_TO_LEAD');
  }

  // PERFECTIONIST — scored 100%.
  if (quizScore != null && totalQuestions != null && quizScore === totalQuestions) {
    const a = await awardSafely(userId, 'PERFECTIONIST', {
      moduleOrderIndex,
      score: quizScore,
      totalQuestions,
    });
    if (a) newly.push('PERFECTIONIST');
  }

  // CERTIFIED_REP (composite) — check whenever module 9 completes.
  if (moduleOrderIndex === 9) {
    const wonCount = await defaultPrisma.roleplaySession.count({
      where: { userId, status: RoleplayStatus.WON },
    });
    if (wonCount >= 3) {
      const a = await awardSafely(userId, 'CERTIFIED_REP', { wonCount });
      if (a) newly.push('CERTIFIED_REP');
    }
  }

  return newly;
}

export async function onRoleplayWon(params: { userId: string; archetypeSlug: string }) {
  const { userId, archetypeSlug } = params;
  const newly: AchievementSlug[] = [];

  // FIRST_CLOSE — first win ever.
  const priorWins = await defaultPrisma.roleplaySession.count({
    where: { userId, status: RoleplayStatus.WON },
  });
  if (priorWins === 1) {
    // this function is called after the session status is set to WON
    const a = await awardSafely(userId, 'FIRST_CLOSE', { archetypeSlug });
    if (a) newly.push('FIRST_CLOSE');
  }

  // OBJECTION_SLAYER — 10 wins total.
  if (priorWins >= 10) {
    const a = await awardSafely(userId, 'OBJECTION_SLAYER', { wins: priorWins });
    if (a) newly.push('OBJECTION_SLAYER');
  }

  // ARCHETYPE_COLLECTOR — won against all 11 archetypes.
  const distinctWonArchetypes = await defaultPrisma.roleplaySession.findMany({
    where: { userId, status: RoleplayStatus.WON },
    select: { archetypeSlug: true },
    distinct: ['archetypeSlug'],
  });
  if (distinctWonArchetypes.length >= 11) {
    const a = await awardSafely(userId, 'ARCHETYPE_COLLECTOR', {
      archetypesBeaten: distinctWonArchetypes.length,
    });
    if (a) newly.push('ARCHETYPE_COLLECTOR');
  }

  // CERTIFIED_REP composite check — if they already have all 9 modules + now 3 wins.
  if (priorWins >= 3) {
    const moduleCount = await defaultPrisma.moduleProgress.count({
      where: { userId, completedAt: { not: null } },
    });
    if (moduleCount >= 9) {
      const a = await awardSafely(userId, 'CERTIFIED_REP', { wonCount: priorWins });
      if (a) newly.push('CERTIFIED_REP');
    }
  }

  return newly;
}

export async function onRoleplayEvaluation(params: { userId: string; driveAllYes: boolean }) {
  const newly: AchievementSlug[] = [];
  if (params.driveAllYes) {
    const a = await awardSafely(params.userId, 'DRIVE_MASTERY');
    if (a) newly.push('DRIVE_MASTERY');
  }
  return newly;
}

export async function onLogin(params: { userId: string }) {
  const newly: AchievementSlug[] = [];

  // Pull the last 30 daily entries; compute the current consecutive streak
  // ending today. `LoginDay` rows are recorded in auth.ts events.signIn.
  const now = new Date();
  const earliest = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  earliest.setUTCDate(earliest.getUTCDate() - 40);

  const days = await defaultPrisma.loginDay.findMany({
    where: { userId: params.userId, day: { gte: earliest } },
    orderBy: { day: 'desc' },
    select: { day: true },
  });

  const daySet = new Set(days.map((d) => d.day.toISOString().slice(0, 10)));

  let streak = 0;
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  if (streak >= 7) {
    const a = await awardSafely(params.userId, 'STREAK_7', { streak });
    if (a) newly.push('STREAK_7');
  }
  if (streak >= 30) {
    const a = await awardSafely(params.userId, 'STREAK_30', { streak });
    if (a) newly.push('STREAK_30');
  }

  return newly;
}
