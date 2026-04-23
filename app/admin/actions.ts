'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

export async function updateUserRoleAction(input: { userId: string; role: Role }) {
  const admin = await requireAdmin();
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: 'Invalid input' };

  // Don't let an admin demote themselves — avoid lockout.
  if (parsed.data.userId === admin.id && parsed.data.role !== 'ADMIN') {
    return { ok: false as const, error: 'Admins cannot demote themselves.' };
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
  });

  logger.info('admin.role.updated', {
    adminId: admin.id,
    targetId: updated.id,
    newRole: updated.role,
  });

  revalidatePath('/admin');
  revalidatePath(`/admin/users/${updated.id}`);
  return { ok: true as const, role: updated.role };
}
