import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import { auth } from '@/auth';

/**
 * Server-side guards for Server Components / Server Actions / Route Handlers.
 * Use these instead of relying on middleware alone — middleware can be skipped
 * in some request paths (streaming, etc.) and defense-in-depth matters.
 */

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect('/signin');
  return session.user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/dashboard');
  return user;
}

export async function requireAdmin() {
  return requireRole('ADMIN');
}

export async function requireManagerOrAdmin() {
  return requireRole('ADMIN', 'MANAGER');
}

/**
 * Returns the session user for API routes, or throws a typed auth error
 * the caller can turn into a 401/403.
 */
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function authedApiUser() {
  const session = await auth();
  if (!session?.user) throw new AuthError('Not authenticated', 401);
  return session.user;
}

export async function authedApiUserWithRole(...roles: Role[]) {
  const user = await authedApiUser();
  if (!roles.includes(user.role)) throw new AuthError('Forbidden', 403);
  return user;
}
