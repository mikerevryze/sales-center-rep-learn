import { NextResponse } from 'next/server';
import { RoleplayStatus } from '@prisma/client';
import { authedApiUser, AuthError } from '@/lib/auth-helpers';
import { endSession } from '@/lib/roleplay/session';
import { logger } from '@/lib/logger';

export async function POST(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = await authedApiUser();
    const { sessionId } = await ctx.params;

    const result = await endSession({
      sessionId,
      userId: user.id,
      outcome: RoleplayStatus.ABANDONED,
    });

    return NextResponse.json({
      sessionId: result.session.id,
      status: result.session.status,
      redirectTo: `/roleplay/${sessionId}/results`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error('roleplay.end.failed', { err: (err as Error).message });
    return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
  }
}
