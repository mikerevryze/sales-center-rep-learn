import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RoleplayStatus } from '@prisma/client';
import { authedApiUser, AuthError } from '@/lib/auth-helpers';
import { checkRateLimit, LIMITS } from '@/lib/rate-limit';
import { anthropic, getClaudeModel, detectOutcome, stripSentinels } from '@/lib/claude';
import { prisma } from '@/lib/db';
import {
  buildAnthropicMessages,
  buildLeadSystem,
  loadSession,
  MAX_MESSAGE_CHARS,
  MAX_TURNS,
} from '@/lib/roleplay/session';
import { endSession } from '@/lib/roleplay/session';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_CHARS),
});

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await authedApiUser();
    const { sessionId } = await ctx.params;

    // Message rate limit — controls Claude cost ceiling.
    const limit = await checkRateLimit({
      bucket: `roleplay-msg:${user.id}`,
      limit: LIMITS.ROLEPLAY_MESSAGES_PER_HOUR,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: `Message rate limit reached. Try again at ${limit.resetAt.toLocaleTimeString()}.`,
        },
        { status: 429 },
      );
    }

    const body = bodySchema.parse(await req.json());

    const loaded = await loadSession(sessionId, user.id);
    if (!loaded) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    const { session, archetype, scenario } = loaded;

    if (session.status !== RoleplayStatus.IN_PROGRESS) {
      return NextResponse.json({ error: 'Session already ended' }, { status: 409 });
    }

    // Append rep message.
    const nextIndex = session.messages.length;
    const repMessage = await prisma.roleplayMessage.create({
      data: {
        sessionId: session.id,
        role: 'REP',
        content: body.content,
        orderIndex: nextIndex,
      },
    });

    // Count turn pairs. A "turn" = 1 rep message + 1 lead message.
    // session.messages already contains the lead opener + any prior turns.
    const repMessageCount = session.messages.filter((m) => m.role === 'REP').length + 1;
    if (repMessageCount > MAX_TURNS) {
      await endSession({ sessionId, userId: user.id, outcome: RoleplayStatus.ABANDONED });
      return NextResponse.json(
        { error: 'Turn limit reached. Session ended.', abandoned: true },
        { status: 410 },
      );
    }

    const anthropicMessages = buildAnthropicMessages([
      ...session.messages,
      { role: repMessage.role, content: repMessage.content },
    ]);

    const stream = await anthropic.messages.stream({
      model: getClaudeModel(),
      max_tokens: 700,
      system: buildLeadSystem(archetype, scenario),
      messages: anthropicMessages,
    });

    // Stream back to the client as SSE-ish chunks while accumulating for DB.
    const encoder = new TextEncoder();
    const userId = user.id;
    const leadIndex = nextIndex + 1;

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let full = '';
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const piece = chunk.delta.text;
              full += piece;
              // Strip sentinels before streaming to the client — never reveal tokens.
              const safePiece = stripSentinels(piece);
              if (safePiece.length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ delta: safePiece })}\n\n`),
                );
              }
            }
          }

          const outcome = detectOutcome(full);
          const cleanContent = stripSentinels(full);

          // Persist the LEAD's message.
          await prisma.roleplayMessage.create({
            data: {
              sessionId,
              role: 'LEAD',
              content: cleanContent,
              orderIndex: leadIndex,
            },
          });

          await prisma.roleplaySession.update({
            where: { id: sessionId },
            data: { turnCount: Math.floor(leadIndex / 2) },
          });

          if (outcome) {
            const status = outcome === 'WON' ? RoleplayStatus.WON : RoleplayStatus.LOST;
            await endSession({ sessionId, userId, outcome: status });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  outcome: status,
                  redirectTo: `/roleplay/${sessionId}/results`,
                })}\n\n`,
              ),
            );
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          }

          controller.close();
        } catch (err) {
          logger.error('roleplay.message.stream.failed', {
            sessionId,
            userId,
            err: (err as Error).message,
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: 'Lead response failed. Try again.' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error('roleplay.message.failed', { err: (err as Error).message });
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
