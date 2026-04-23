import NextAuth, { type DefaultSession } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Google from 'next-auth/providers/google';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { allowedEmailDomain, env, superAdminEmails } from '@/lib/env';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      hideFromLeaderboard: boolean;
    } & DefaultSession['user'];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface User {
    role?: Role;
    hideFromLeaderboard?: boolean;
  }
}

function emailDomain(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/signin/error',
  },
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      // Restrict the Google account picker to the configured workspace domain.
      authorization: {
        params: {
          prompt: 'select_account',
          hd: allowedEmailDomain,
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Enforce the workspace domain server-side. `hd` above is a UX hint only —
      // the definitive check happens here and cannot be bypassed by the client.
      const domain = emailDomain(profile?.email);
      if (!domain || domain !== allowedEmailDomain) return false;
      // `email_verified` is set by Google when the mailbox is verified.
      if (profile && 'email_verified' in profile && profile.email_verified === false) {
        return false;
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      // On initial sign-in `user` is the DB record (populated by the Prisma adapter).
      if (user?.id) {
        const email = (user.email ?? '').toLowerCase();
        const shouldBeAdmin = !!email && superAdminEmails.has(email);

        let role: Role = (user.role as Role | undefined) ?? 'REP';
        let hideFromLeaderboard = user.hideFromLeaderboard ?? false;

        // If the user should be admin but isn't yet, promote them.
        if (shouldBeAdmin && role !== 'ADMIN') {
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' },
          });
          role = updated.role;
          hideFromLeaderboard = updated.hideFromLeaderboard;
        }

        token.sub = user.id;
        token.role = role;
        token.hideFromLeaderboard = hideFromLeaderboard;
      }

      // Refresh on session.update() so role changes propagate without a re-login.
      if (trigger === 'update' && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true, hideFromLeaderboard: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.hideFromLeaderboard = fresh.hideFromLeaderboard;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as Role | undefined) ?? 'REP';
        session.user.hideFromLeaderboard =
          (token.hideFromLeaderboard as boolean | undefined) ?? false;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      const today = new Date();
      const day = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: today },
        }),
        prisma.loginDay.upsert({
          where: { userId_day: { userId: user.id, day } },
          update: {},
          create: { userId: user.id, day },
        }),
      ]);
    },
  },
});
