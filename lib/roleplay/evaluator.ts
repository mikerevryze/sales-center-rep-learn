import { z } from 'zod';
import { anthropic, getClaudeModel } from '@/lib/claude';
import type { Archetype } from '@/lib/content';
import type { Scenario } from '@/lib/roleplay/prompts';
import { logger } from '@/lib/logger';

// ============================================
// Schema — what the evaluator returns
// ============================================

export const driveRatingSchema = z.enum(['yes', 'partial', 'no']);

export const driveScoreSchema = z.object({
  rating: driveRatingSchema,
  reason: z.string().min(1).max(500),
});

export const bannedPhraseHitSchema = z.object({
  phrase: z.string().min(1),
  quote: z.string().min(1).max(500),
});

export const evaluationSchema = z.object({
  driveScores: z.object({
    D: driveScoreSchema,
    R: driveScoreSchema,
    I: driveScoreSchema,
    V: driveScoreSchema,
    E: driveScoreSchema,
  }),
  bannedPhrasesUsed: z.array(bannedPhraseHitSchema),
  objectionBehindObjection: z.object({
    uncovered: z.boolean(),
    evidence: z.string().max(1000),
  }),
  overallPass: z.boolean(),
  thingsDoneWell: z.array(z.string().max(400)).min(1).max(5),
  thingsToImprove: z.array(z.string().max(400)).min(1).max(5),
  lineToReplay: z
    .object({
      whatTheySaid: z.string().max(500),
      whatTheyShouldHaveSaid: z.string().max(500),
    })
    .nullable(),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

// ============================================
// Transcript formatter
// ============================================

export interface TranscriptTurn {
  role: 'REP' | 'LEAD';
  content: string;
}

function formatTranscript(turns: TranscriptTurn[]): string {
  return turns
    .map((t, i) => {
      const speaker = t.role === 'REP' ? 'REP' : 'LEAD';
      return `[${i + 1}] ${speaker}: ${t.content}`;
    })
    .join('\n\n');
}

// ============================================
// Evaluator prompt
// ============================================

function buildEvaluatorSystemPrompt(): string {
  return `You are a sales coach at Revryze, a pre-sales agency that trains reps to sell franchise memberships.

You are grading a rep's cold-call roleplay against the DRIVE framework. Be honest, specific, and direct — the rep benefits more from candid feedback than from flattery.

## THE DRIVE FRAMEWORK

- **D — Disarm:** A status-raising opener that drops the lead's guard. Canonical opener contains: "quick second between calls setting people up," "out of the blue," "what initially got you interested?" — on first-name basis, warm, not scripted. NEVER opens with "is now a good time?" (banned).
- **R — Reserve the close:** An upfront contract within the first 60 seconds. Canonical form: "if we both agree this is a fit, I can save you more on our founding memberships — is that fair?" Establishes mutual-yes before the pitch.
- **I — Investigate:** The Why Chain. Asks open-ended questions about goals and why NOW. Probes past the stated answer ("to get in shape") to the emotional weight (doctor's orders, turning 40, spouse's concern, weight-loss journey). 60/40 lead-to-rep talk time target.
- **V — Value-stack:** Presents the founding membership with the zero-risk frame (grace-period refund, no contract, one-time charge before opening). Uses the three-point price anchor (opening / standard founder / call-exclusive). Recommends a tier based on what the lead said, using the lead's own words.
- **E — Execute:** The close is a question, not a statement. Canonical: "Are you opposed to getting set up today?" Alternates: "Would it not make sense to get locked in at this rate today?" / "Let's lock this in — I'll need your first name, last name, and email." Does NOT settle for "I'll email you info."

## RATING EACH STEP

- **"yes"** — The step was executed clearly and with recognizable Revryze language.
- **"partial"** — The step was attempted but weak, rushed, or missed a key ingredient.
- **"no"** — The step was skipped entirely or mishandled so badly it didn't land.

## BANNED PHRASES TO FLAG

Flag any of these uses, even once:

- "I totally understand" — sounds scripted
- "Is now a good time?" — trained brush-off trigger
- "I'll email you info" — substitute for closing, kills the sale
- "Take your time" — tells the lead speed doesn't matter
- "I'm just trying to help" — desperate tone

For each hit, include a direct quote from the transcript.

## OBJECTION BEHIND THE OBJECTION

Every objection has a real one underneath. "I need to think about it" is usually price. "I need to check with my spouse" is usually money. "I want to try it first" is usually risk aversion. Did the rep surface the REAL objection, or did they handle the surface one and move on?

## PASS / FAIL

Pass = at least 4 of 5 DRIVE steps rated "yes", zero banned phrases, AND objection-behind-objection uncovered. Anything less = fail.

## OUTPUT FORMAT

Respond ONLY with a raw JSON object matching this schema exactly (no markdown fences, no commentary):

{
  "driveScores": {
    "D": { "rating": "yes|partial|no", "reason": "one-sentence explanation" },
    "R": { "rating": "yes|partial|no", "reason": "..." },
    "I": { "rating": "yes|partial|no", "reason": "..." },
    "V": { "rating": "yes|partial|no", "reason": "..." },
    "E": { "rating": "yes|partial|no", "reason": "..." }
  },
  "bannedPhrasesUsed": [
    { "phrase": "I totally understand", "quote": "the rep's exact line containing it" }
  ],
  "objectionBehindObjection": {
    "uncovered": true|false,
    "evidence": "short evidence explaining why you ruled yes or no"
  },
  "overallPass": true|false,
  "thingsDoneWell": ["up to 3 specific strengths"],
  "thingsToImprove": ["up to 3 specific areas to improve"],
  "lineToReplay": {
    "whatTheySaid": "a specific rep line that was weak or off-pattern",
    "whatTheyShouldHaveSaid": "what a strong rep would have said instead"
  }
}

If there's nothing worth replaying (very strong call), set "lineToReplay" to null.`;
}

// ============================================
// Evaluator entry point
// ============================================

export async function evaluateSession(args: {
  archetype: Archetype;
  scenario: Scenario;
  transcript: TranscriptTurn[];
  outcome: 'WON' | 'LOST' | 'ABANDONED';
}): Promise<Evaluation> {
  const { archetype, scenario, transcript, outcome } = args;

  const userPayload = `ARCHETYPE: ${archetype.name}
DIFFICULTY: ${archetype.difficulty}
SESSION OUTCOME: ${outcome}

LEAD SCENARIO:
Name: ${scenario.firstName} ${scenario.lastName}
Age: ${scenario.age}
Location: ${scenario.city}, ${scenario.state}
Specific detail: ${scenario.specificDetail}
Emotional weight (what a good rep should uncover): ${archetype.emotionalWeight}

TRANSCRIPT (numbered turns):
${formatTranscript(transcript)}

Grade this call. Respond with the JSON only.`;

  const response = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 2048,
    system: buildEvaluatorSystemPrompt(),
    messages: [{ role: 'user', content: userPayload }],
  });

  const text = response.content
    .map((block) => ('text' in block ? block.text : ''))
    .join('')
    .trim();

  // Strip any accidental code fences.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch (err) {
    logger.error('evaluation.parse.failed', {
      preview: cleaned.slice(0, 300),
      err: (err as Error).message,
    });
    throw new Error('Evaluator returned non-JSON response');
  }

  const parsed = evaluationSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error('evaluation.schema.failed', {
      issues: parsed.error.issues.slice(0, 5),
    });
    throw new Error('Evaluator returned invalid JSON shape');
  }

  return parsed.data;
}

export function buildFeedbackMarkdown(e: Evaluation): string {
  const drivePairs: Array<[string, string]> = [
    ['D (Disarm)', e.driveScores.D.reason],
    ['R (Reserve the close)', e.driveScores.R.reason],
    ['I (Investigate)', e.driveScores.I.reason],
    ['V (Value-stack)', e.driveScores.V.reason],
    ['E (Execute)', e.driveScores.E.reason],
  ];
  const ratings: Record<string, string> = {
    yes: '✅',
    partial: '🟡',
    no: '❌',
  };
  const driveLines = (
    Object.entries(e.driveScores) as Array<[string, { rating: string; reason: string }]>
  ).map(([, v], i) => {
    const [label] = drivePairs[i]!;
    return `- **${label}** — ${ratings[v.rating] ?? ''} ${v.reason}`;
  });
  const sections = [
    '### DRIVE breakdown',
    driveLines.join('\n'),
    '### Things you did well',
    e.thingsDoneWell.map((x) => `- ${x}`).join('\n'),
    '### Things to improve',
    e.thingsToImprove.map((x) => `- ${x}`).join('\n'),
  ];
  if (e.lineToReplay) {
    sections.push(
      '### Line to replay',
      `> You said: *"${e.lineToReplay.whatTheySaid}"*`,
      ``,
      `**Better:** ${e.lineToReplay.whatTheyShouldHaveSaid}`,
    );
  }
  if (e.bannedPhrasesUsed.length > 0) {
    sections.push(
      '### Banned phrases detected',
      e.bannedPhrasesUsed.map((b) => `- **${b.phrase}** — "${b.quote}"`).join('\n'),
    );
  }
  return sections.join('\n\n');
}
