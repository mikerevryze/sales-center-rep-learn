import { RoleplayStatus, type Role } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  currentModuleTitle: string | null;
  modulesCompleted: number;
  totalModules: number;
  roleplayWins: number;
  roleplayTotal: number;
  roleplayWinRate: number;
  lastActiveAt: Date;
  createdAt: Date;
}

export async function getAllAdminUsers(options: { search?: string } = {}): Promise<AdminUserRow[]> {
  const { search } = options;
  const totalModules = await prisma.module.count();

  const users = await prisma.user.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { lastActiveAt: 'desc' },
  });

  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return [];

  const [moduleDone, roleplayStats, progressLatest, modules] = await Promise.all([
    prisma.moduleProgress.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, completedAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.roleplaySession.groupBy({
      by: ['userId', 'status'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    }),
    prisma.moduleProgress.findMany({
      where: { userId: { in: userIds }, completedAt: null },
      orderBy: { startedAt: 'desc' },
      select: { userId: true, moduleId: true, startedAt: true },
    }),
    prisma.module.findMany({
      select: { id: true, orderIndex: true, title: true },
    }),
  ]);

  const moduleById = new Map(modules.map((m) => [m.id, m]));
  const doneByUser = new Map(moduleDone.map((r) => [r.userId, r._count._all]));

  // Latest in-progress module per user
  const currentByUser = new Map<string, { moduleId: string; startedAt: Date }>();
  for (const p of progressLatest) {
    if (!currentByUser.has(p.userId)) {
      currentByUser.set(p.userId, { moduleId: p.moduleId, startedAt: p.startedAt });
    }
  }

  // Roleplay stats: split into won vs total per user
  const roleplayByUser = new Map<string, { wins: number; total: number }>();
  for (const r of roleplayStats) {
    const prev = roleplayByUser.get(r.userId) ?? { wins: 0, total: 0 };
    prev.total += r._count._all;
    if (r.status === RoleplayStatus.WON) prev.wins += r._count._all;
    roleplayByUser.set(r.userId, prev);
  }

  return users.map((u) => {
    const current = currentByUser.get(u.id);
    const currentModule = current ? (moduleById.get(current.moduleId) ?? null) : null;
    const rp = roleplayByUser.get(u.id) ?? { wins: 0, total: 0 };
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      image: u.image,
      role: u.role,
      currentModuleTitle: currentModule
        ? `Module ${currentModule.orderIndex}: ${currentModule.title}`
        : null,
      modulesCompleted: doneByUser.get(u.id) ?? 0,
      totalModules,
      roleplayWins: rp.wins,
      roleplayTotal: rp.total,
      roleplayWinRate: rp.total === 0 ? 0 : Math.round((rp.wins / rp.total) * 100),
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt,
    };
  });
}

export async function getAdminAnalytics() {
  const [totalUsers, totalModules, avgCompletion, mostFailedQuizzes, roleplayByArchetype] =
    await Promise.all([
      prisma.user.count(),
      prisma.module.count(),
      prisma.moduleProgress.groupBy({
        by: ['moduleId'],
        _count: { _all: true },
        where: { completedAt: { not: null } },
      }),
      prisma.$queryRawUnsafe<Array<{ questionId: string; prompt: string; wrongCount: bigint }>>(
        `
      SELECT q.id AS "questionId", q.prompt, COUNT(*) AS "wrongCount"
      FROM "QuizAttempt" a
      CROSS JOIN LATERAL jsonb_array_elements(a."answersJson") AS ans
      JOIN "QuizQuestion" q ON q.id = ans->>'questionId'
      WHERE (ans->>'correct')::boolean = false
      GROUP BY q.id, q.prompt
      ORDER BY "wrongCount" DESC
      LIMIT 10
      `,
      ),
      prisma.roleplaySession.groupBy({
        by: ['archetypeSlug', 'status'],
        _count: { _all: true },
      }),
    ]);

  const byArchetype = new Map<string, { wins: number; total: number }>();
  for (const r of roleplayByArchetype) {
    const prev = byArchetype.get(r.archetypeSlug) ?? { wins: 0, total: 0 };
    prev.total += r._count._all;
    if (r.status === RoleplayStatus.WON) prev.wins += r._count._all;
    byArchetype.set(r.archetypeSlug, prev);
  }

  return {
    totalUsers,
    totalModules,
    moduleCompletionByModuleId: avgCompletion,
    mostFailedQuizzes: mostFailedQuizzes.map((q) => ({
      questionId: q.questionId,
      prompt: q.prompt,
      wrongCount: Number(q.wrongCount),
    })),
    archetypeStats: Array.from(byArchetype.entries()).map(([slug, s]) => ({
      slug,
      wins: s.wins,
      total: s.total,
      passRate: s.total === 0 ? 0 : Math.round((s.wins / s.total) * 100),
    })),
  };
}
