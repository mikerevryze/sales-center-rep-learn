import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authedApiUser, AuthError } from '@/lib/auth-helpers';
import { checkRateLimit, LIMITS } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';
import { startSession } from '@/lib/roleplay/session';
import { logger } from '@/lib/logger';
import { loadArchetypes } from '@/lib/content';

const bodySchema = z.object({
  archetypeSlug: z.string().min(1).max(80).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await authedApiUser();

    // Per-day cap on new sessions to keep Claude costs bounded.
    const dayLimit = await checkRateLimit({
      bucket: `roleplay-session:${user.id}`,
      limit: LIMITS.ROLEPLAY_SESSIONS_PER_DAY,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!dayLimit.allowed) {
      return NextResponse.json(
        { error: 'Daily roleplay session cap reached. Try again tomorrow.' },
        { status: 429 },
      );
    }

    const body = bodySchema.parse(await req.json().catch(() => ({})));

    let archetypeSlug = body.archetypeSlug;
    if (!archetypeSlug) {
      // Random archetype.
      const all = await loadArchetypes();
      if (all.length === 0) {
        return NextResponse.json({ error: 'No archetypes configured' }, { status: 500 });
      }
      const chosen = all[Math.floor(Math.random() * all.length)]!;
      archetypeSlug = chosen.slug;
    }

    const { session, archetype, scenario } = await startSession({
      userId: user.id,
      archetypeSlug,
    });

    // Seed the transcript with the LEAD's opening line (archetype.openingLine).
    await prisma.roleplayMessage.create({
      data: {
        sessionId: session.id,
        role: 'LEAD',
        content: archetype.openingLine,
        orderIndex: 0,
      },
    });

    logger.info('roleplay.start', {
      userId: user.id,
      sessionId: session.id,
      archetypeSlug,
    });

    return NextResponse.json({
      sessionId: session.id,
      archetype: {
        slug: archetype.slug,
        name: archetype.name,
        difficulty: archetype.difficulty,
      },
      scenario,
      firstMessage: archetype.openingLine,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error('roleplay.start.failed', { err: (err as Error).message });
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 });
  }
}
