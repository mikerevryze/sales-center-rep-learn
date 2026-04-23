import { NextResponse } from 'next/server';
import { authedApiUser, AuthError } from '@/lib/auth-helpers';
import { buildCertificatePDF } from '@/lib/cert';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await authedApiUser();

    // Certificate only issues once all 9 modules are complete.
    const completed = await prisma.moduleProgress.count({
      where: { userId: user.id, completedAt: { not: null } },
    });
    const total = await prisma.module.count();
    if (total === 0 || completed < total) {
      return NextResponse.json(
        { error: 'Certificate becomes available after all 9 modules are complete.' },
        { status: 403 },
      );
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true },
    });

    const cert = await prisma.achievement.findUnique({
      where: { userId_slug: { userId: user.id, slug: 'CERTIFIED_REP' } },
    });

    const stream = await buildCertificatePDF({
      name: profile?.name ?? profile?.email ?? 'Revryze Rep',
      issuedAt: cert?.earnedAt ?? new Date(),
      certificateId: cert?.id ?? user.id,
    });

    return new Response(stream as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="revryze-certified-rep.pdf"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: 'Failed to generate certificate' }, { status: 500 });
  }
}
