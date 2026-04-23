import { z } from 'zod';
import { RoleplayStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { anthropic, getClaudeModel } from '@/lib/claude';
import { loadArchetypeBySlug, type Archetype } from '@/lib/content';
import {
  buildLeadSystemPrompt,
  buildScenarioGenerationPrompt,
  type Scenario,
} from '@/lib/roleplay/prompts';
import {
  buildFeedbackMarkdown,
  evaluateSession,
  type TranscriptTurn,
} from '@/lib/roleplay/evaluator';
import { onRoleplayEvaluation, onRoleplayWon } from '@/lib/achievements';
import { logger } from '@/lib/logger';

export const MAX_TURNS = 40;

// Hard cap on message size to keep Claude calls and UI predictable.
export const MAX_MESSAGE_CHARS = 2000;

export const scenarioSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
  age: z.number().int().min(18).max(90),
  city: z.string().min(1).max(60),
  state: z.string().min(2).max(2),
  specificDetail: z.string().min(5).max(500),
  priceConcern: z.number().int().min(20).max(1000),
  otherDetails: z.array(z.string().max(200)).min(1).max(6),
}) satisfies z.ZodType<Scenario>;

// ============================================
// Scenario generation
// ============================================

export async function generateScenario(archetype: Archetype): Promise<Scenario> {
  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 600,
    messages: [{ role: 'user', content: buildScenarioGenerationPrompt(archetype) }],
  });

  const raw = response.content
    .map((b) => ('text' in b ? b.text : ''))
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Scenario generator returned non-JSON response');
  }

  return scenarioSchema.parse(parsed);
}

// ============================================
// Session management
// ============================================

export async function startSession(params: { userId: string; archetypeSlug: string }) {
  const archetype = await loadArchetypeBySlug(params.archetypeSlug);
  if (!archetype) throw new Error(`Unknown archetype: ${params.archetypeSlug}`);

  const scenario = await generateScenario(archetype);

  const session = await prisma.roleplaySession.create({
    data: {
      userId: params.userId,
      archetypeSlug: archetype.slug,
      scenarioJson: scenario as unknown as Prisma.InputJsonValue,
      status: RoleplayStatus.IN_PROGRESS,
    },
  });

  return { session, archetype, scenario };
}

export async function loadSession(sessionId: string, userId: string) {
  const session = await prisma.roleplaySession.findFirst({
    where: { id: sessionId, userId },
    include: { messages: { orderBy: { orderIndex: 'asc' } } },
  });
  if (!session) return null;
  const archetype = await loadArchetypeBySlug(session.archetypeSlug);
  if (!archetype) throw new Error(`Archetype missing from content: ${session.archetypeSlug}`);
  const scenario = scenarioSchema.parse(session.scenarioJson);
  return { session, archetype, scenario };
}

/**
 * Builds the Anthropic messages array from the stored transcript.
 * Our DB stores the LEAD's opening line as message[0] (orderIndex 0, role LEAD).
 * When sending to Claude, that must map to an `assistant` message so Claude
 * continues the character.
 */
export function buildAnthropicMessages(
  storedMessages: Array<{ role: 'REP' | 'LEAD' | 'SYSTEM'; content: string }>,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const msgs: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of storedMessages) {
    if (m.role === 'SYSTEM') continue;
    msgs.push({
      role: m.role === 'REP' ? 'user' : 'assistant',
      content: m.content,
    });
  }
  return msgs;
}

export function buildLeadSystem(archetype: Archetype, scenario: Scenario): string {
  return buildLeadSystemPrompt(archetype, scenario);
}

// ============================================
// Ending + evaluation
// ============================================

export async function endSession(params: {
  sessionId: string;
  userId: string;
  outcome: RoleplayStatus;
}) {
  const { sessionId, userId, outcome } = params;
  const loaded = await loadSession(sessionId, userId);
  if (!loaded) throw new Error('Session not found');
  const { session, archetype, scenario } = loaded;

  if (session.status !== RoleplayStatus.IN_PROGRESS) {
    // Already finalized; just return the existing evaluation if any.
    const existing = await prisma.roleplayEvaluation.findUnique({ where: { sessionId } });
    return { session, archetype, scenario, evaluation: existing };
  }

  const finalized = await prisma.roleplaySession.update({
    where: { id: sessionId },
    data: { status: outcome, endedAt: new Date() },
    include: { messages: { orderBy: { orderIndex: 'asc' } } },
  });

  // Grade via a separate Claude call.
  const transcript: TranscriptTurn[] = finalized.messages
    .filter((m) => m.role !== 'SYSTEM')
    .map((m) => ({ role: m.role as 'REP' | 'LEAD', content: m.content }));

  let evaluation = null;
  try {
    const graded = await evaluateSession({
      archetype,
      scenario,
      transcript,
      outcome:
        outcome === RoleplayStatus.WON
          ? 'WON'
          : outcome === RoleplayStatus.LOST
            ? 'LOST'
            : 'ABANDONED',
    });

    const driveAllYes = (['D', 'R', 'I', 'V', 'E'] as const).every(
      (k) => graded.driveScores[k].rating === 'yes',
    );

    evaluation = await prisma.roleplayEvaluation.create({
      data: {
        sessionId,
        driveScoresJson: graded.driveScores as unknown as Prisma.InputJsonValue,
        bannedPhrasesUsedJson: graded.bannedPhrasesUsed as unknown as Prisma.InputJsonValue,
        objectionBehindObjection: graded.objectionBehindObjection.uncovered,
        objectionEvidence: graded.objectionBehindObjection.evidence || null,
        overallPass: graded.overallPass,
        feedbackMarkdown: buildFeedbackMarkdown(graded),
      },
    });

    // Fire achievement hooks.
    if (outcome === RoleplayStatus.WON) {
      await onRoleplayWon({ userId, archetypeSlug: archetype.slug });
    }
    await onRoleplayEvaluation({ userId, driveAllYes });
  } catch (err) {
    logger.error('evaluation.failed', {
      sessionId,
      err: (err as Error).message,
    });
    // Store a fallback eval so the results page still shows something meaningful.
    evaluation = await prisma.roleplayEvaluation.create({
      data: {
        sessionId,
        driveScoresJson: {
          D: { rating: 'partial', reason: 'Automated evaluator failed to grade this call.' },
          R: { rating: 'partial', reason: 'Automated evaluator failed to grade this call.' },
          I: { rating: 'partial', reason: 'Automated evaluator failed to grade this call.' },
          V: { rating: 'partial', reason: 'Automated evaluator failed to grade this call.' },
          E: { rating: 'partial', reason: 'Automated evaluator failed to grade this call.' },
        } as unknown as Prisma.InputJsonValue,
        bannedPhrasesUsedJson: [] as unknown as Prisma.InputJsonValue,
        objectionBehindObjection: false,
        objectionEvidence: null,
        overallPass: outcome === RoleplayStatus.WON,
        feedbackMarkdown:
          'The automated evaluator was unable to grade this session. Your transcript is saved — ask your pod leader to review it manually.',
      },
    });
  }

  return { session: finalized, archetype, scenario, evaluation };
}
