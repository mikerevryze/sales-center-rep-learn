'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

const toggleSchema = z.object({
  hideFromLeaderboard: z.boolean(),
});

export async function updateLeaderboardVisibility(input: { hideFromLeaderboard: boolean }) {
  const user = await requireUser();
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' };
  await prisma.user.update({
    where: { id: user.id },
    data: { hideFromLeaderboard: parsed.data.hideFromLeaderboard },
  });
  revalidatePath('/settings');
  revalidatePath('/leaderboard');
  return { ok: true as const };
}
