import { prisma } from '@/lib/db';

export const PASS_THRESHOLD = 0.8; // 80% to pass a module quiz

export interface ModuleWithProgress {
  id: string;
  slug: string;
  orderIndex: number;
  title: string;
  summary: string;
  isFinal: boolean;
  questionCount: number;
  progress: {
    startedAt: Date | null;
    readAt: Date | null;
    completedAt: Date | null;
    quizScore: number | null;
  } | null;
  locked: boolean;
  unlockedReason?: string;
}

/**
 * Returns all modules with the rep's progress + per-module locked state.
 * Module N is locked until Module N-1 is completed.
 */
export async function getModulesForUser(userId: string): Promise<ModuleWithProgress[]> {
  const [modules, progressRows] = await Promise.all([
    prisma.module.findMany({
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: { select: { questions: true } },
      },
    }),
    prisma.moduleProgress.findMany({ where: { userId } }),
  ]);

  const progressByModule = new Map(progressRows.map((p) => [p.moduleId, p]));
  const result: ModuleWithProgress[] = [];

  let prevCompleted = true; // module 1 is always unlocked
  for (const m of modules) {
    const p = progressByModule.get(m.id) ?? null;
    const locked = !prevCompleted;

    result.push({
      id: m.id,
      slug: m.slug,
      orderIndex: m.orderIndex,
      title: m.title,
      summary: m.summary,
      isFinal: m.isFinal,
      questionCount: m._count.questions,
      progress: p
        ? {
            startedAt: p.startedAt,
            readAt: p.readAt,
            completedAt: p.completedAt,
            quizScore: p.quizScore,
          }
        : null,
      locked,
      unlockedReason: locked ? `Complete Module ${m.orderIndex - 1} first` : undefined,
    });

    prevCompleted = !!p?.completedAt;
  }

  return result;
}

export async function getModuleBySlug(slug: string) {
  return prisma.module.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: { orderIndex: 'asc' } },
    },
  });
}

/**
 * Verifies that a user is allowed to view / interact with a given module.
 * Returns the module + their progress record if allowed; throws otherwise.
 */
export async function assertModuleAccessible(userId: string, slug: string) {
  const mod = await getModuleBySlug(slug);
  if (!mod) throw new Error('Module not found');

  if (mod.orderIndex === 1) {
    const progress = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId, moduleId: mod.id } },
    });
    return { module: mod, progress };
  }

  const prev = await prisma.module.findFirst({
    where: { orderIndex: mod.orderIndex - 1 },
  });
  if (!prev) throw new Error('Previous module not found');

  const prevProgress = await prisma.moduleProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId: prev.id } },
  });

  if (!prevProgress?.completedAt) {
    throw new Error(
      `Module ${mod.orderIndex} is locked — complete Module ${prev.orderIndex} first`,
    );
  }

  const progress = await prisma.moduleProgress.findUnique({
    where: { userId_moduleId: { userId, moduleId: mod.id } },
  });

  return { module: mod, progress };
}

export async function ensureModuleStarted(userId: string, moduleId: string) {
  return prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, startedAt: new Date() },
    update: {},
  });
}

export function computeQuizPass(score: number, total: number) {
  return total > 0 && score / total >= PASS_THRESHOLD;
}

export function percentScore(score: number, total: number) {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}
