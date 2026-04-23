import { RoleplayStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface LeaderboardRow {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  wins: number;
  modulesCompleted: number;
  score: number;
  rank: number;
}

export interface LeaderboardOpts {
  forAdmin?: boolean;
  limit?: number;
  currentUserId?: string;
}

// Score formula per spec: (wins × 1) + (modules × 5).
const SCORE = (wins: number, mods: number) => wins + mods * 5;

export async function getLeaderboard(opts: LeaderboardOpts = {}): Promise<LeaderboardRow[]> {
  const { forAdmin = false, limit = 10 } = opts;

  // Aggregate wins and completed modules per user in parallel.
  const [users, winAgg, moduleAgg] = await Promise.all([
    prisma.user.findMany({
      where: forAdmin ? {} : { hideFromLeaderboard: false },
      select: { id: true, name: true, email: true, image: true, hideFromLeaderboard: true },
    }),
    prisma.roleplaySession.groupBy({
      by: ['userId'],
      where: { status: RoleplayStatus.WON },
      _count: { _all: true },
    }),
    prisma.moduleProgress.groupBy({
      by: ['userId'],
      where: { completedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const winsByUser = new Map(winAgg.map((w) => [w.userId, w._count._all]));
  const modsByUser = new Map(moduleAgg.map((m) => [m.userId, m._count._all]));

  const rows = users
    .map((u) => {
      const wins = winsByUser.get(u.id) ?? 0;
      const modulesCompleted = modsByUser.get(u.id) ?? 0;
      return {
        userId: u.id,
        name: u.name ?? u.email.split('@')[0] ?? 'Rep',
        email: u.email,
        image: u.image,
        wins,
        modulesCompleted,
        score: SCORE(wins, modulesCompleted),
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.wins - a.wins || b.modulesCompleted - a.modulesCompleted)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return rows.slice(0, limit);
}
