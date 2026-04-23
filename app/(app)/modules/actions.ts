'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth-helpers';
import { computeQuizPass } from '@/lib/modules';
import { onModuleCompleted } from '@/lib/achievements';
import { checkRateLimit, LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// ================================================
// Mark module as read
// ================================================

const markReadSchema = z.object({
  moduleId: z.string().min(1),
});

export async function markModuleReadAction(formData: FormData) {
  const user = await requireUser();
  const parsed = markReadSchema.safeParse({ moduleId: formData.get('moduleId') });
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' };

  const mod = await prisma.module.findUnique({ where: { id: parsed.data.moduleId } });
  if (!mod) return { ok: false as const, error: 'Module not found' };

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
    create: { userId: user.id, moduleId: mod.id, startedAt: new Date(), readAt: new Date() },
    update: { readAt: new Date() },
  });

  revalidatePath(`/modules/${mod.slug}`);
  revalidatePath('/modules');
  return { ok: true as const };
}

// ================================================
// Submit quiz
// ================================================

const submitQuizSchema = z.object({
  moduleId: z.string().min(1),
  answers: z.array(z.number().int().min(0).max(3)),
});

export interface QuizSubmitResult {
  ok: boolean;
  passed?: boolean;
  score?: number;
  totalQuestions?: number;
  results?: Array<{
    questionId: string;
    correctIndex: number;
    selectedIndex: number;
    correct: boolean;
    explanation: string;
  }>;
  newAchievements?: string[];
  error?: string;
}

export async function submitQuizAction(input: {
  moduleId: string;
  answers: number[];
}): Promise<QuizSubmitResult> {
  const user = await requireUser();
  const parsed = submitQuizSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input' };

  // Rate limit quiz submissions (prevent brute force / abuse).
  const limit = await checkRateLimit({
    bucket: `quiz:${user.id}`,
    limit: LIMITS.QUIZ_ATTEMPTS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    return {
      ok: false,
      error: `Too many quiz attempts. Try again at ${limit.resetAt.toLocaleTimeString()}.`,
    };
  }

  const mod = await prisma.module.findUnique({
    where: { id: parsed.data.moduleId },
    include: { questions: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!mod) return { ok: false, error: 'Module not found' };

  if (parsed.data.answers.length !== mod.questions.length) {
    return { ok: false, error: 'Answer count mismatch' };
  }

  // Grade server-side — never trust client.
  let score = 0;
  const results = mod.questions.map((q, i) => {
    const selected = parsed.data.answers[i]!;
    const correct = q.correctIndex === selected;
    if (correct) score += 1;
    return {
      questionId: q.id,
      correctIndex: q.correctIndex,
      selectedIndex: selected,
      correct,
      explanation: q.explanation,
    };
  });

  const passed = computeQuizPass(score, mod.questions.length);

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      moduleId: mod.id,
      score,
      totalQuestions: mod.questions.length,
      passed,
      answersJson: results.map((r) => ({
        questionId: r.questionId,
        selectedIndex: r.selectedIndex,
        correct: r.correct,
      })),
    },
  });

  logger.info('quiz.submitted', {
    userId: user.id,
    moduleSlug: mod.slug,
    score,
    total: mod.questions.length,
    passed,
    attemptId: attempt.id,
  });

  let newAchievements: string[] = [];

  if (passed) {
    // Complete the module on first pass. Keep the best quiz score.
    const prev = await prisma.moduleProgress.findUnique({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
    });

    const startedAt = prev?.startedAt ?? new Date();
    const completedAt = prev?.completedAt ?? new Date();
    const bestScore = Math.max(score, prev?.quizScore ?? 0);

    const updated = await prisma.moduleProgress.upsert({
      where: { userId_moduleId: { userId: user.id, moduleId: mod.id } },
      create: {
        userId: user.id,
        moduleId: mod.id,
        startedAt,
        readAt: prev?.readAt ?? new Date(),
        completedAt,
        quizScore: score,
      },
      update: {
        completedAt,
        quizScore: bestScore,
        readAt: prev?.readAt ?? new Date(),
      },
    });

    if (!prev?.completedAt) {
      newAchievements = await onModuleCompleted({
        userId: user.id,
        moduleOrderIndex: mod.orderIndex,
        startedAt: updated.startedAt,
        completedAt: updated.completedAt!,
        quizScore: score,
        totalQuestions: mod.questions.length,
      });
    } else if (score === mod.questions.length) {
      // Re-take with perfect score awards PERFECTIONIST even after first pass.
      newAchievements = await onModuleCompleted({
        userId: user.id,
        moduleOrderIndex: mod.orderIndex,
        startedAt: updated.startedAt,
        completedAt: updated.completedAt!,
        quizScore: score,
        totalQuestions: mod.questions.length,
      });
    }
  }

  revalidatePath(`/modules/${mod.slug}`);
  revalidatePath(`/modules/${mod.slug}/quiz`);
  revalidatePath('/modules');
  revalidatePath('/dashboard');

  return {
    ok: true,
    passed,
    score,
    totalQuestions: mod.questions.length,
    results,
    newAchievements,
  };
}

export async function continueToNextModuleAction(currentSlug: string) {
  await requireUser();
  const current = await prisma.module.findUnique({ where: { slug: currentSlug } });
  if (!current) redirect('/modules');
  const next = await prisma.module.findFirst({
    where: { orderIndex: current.orderIndex + 1 },
  });
  redirect(next ? `/modules/${next.slug}` : '/dashboard');
}
