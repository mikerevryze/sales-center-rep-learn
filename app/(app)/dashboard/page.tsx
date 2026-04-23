import Link from 'next/link';
import { ArrowRight, BookOpen, MessageSquare, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { requireUser } from '@/lib/auth-helpers';
import { getModulesForUser } from '@/lib/modules';
import { getLeaderboard } from '@/lib/leaderboard';
import { prisma } from '@/lib/db';
import { formatDate, relativeTime } from '@/lib/utils';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await requireUser();

  const [modules, recentAch, sessionCounts, lastWeekSessions, leaderboard] = await Promise.all([
    getModulesForUser(user.id),
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' },
      take: 4,
    }),
    prisma.roleplaySession.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: { _all: true },
    }),
    prisma.roleplaySession.count({
      where: {
        userId: user.id,
        startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    getLeaderboard({
      forAdmin: user.role === 'ADMIN' || user.role === 'MANAGER',
      limit: 5,
      currentUserId: user.id,
    }),
  ]);

  const completedCount = modules.filter((m) => m.progress?.completedAt).length;
  const completionPct = Math.round((completedCount / modules.length) * 100);
  const currentModule =
    modules.find((m) => !m.locked && !m.progress?.completedAt) ?? modules[modules.length - 1];

  const wins = sessionCounts.find((c) => c.status === 'WON')?._count._all ?? 0;
  const losses = sessionCounts.find((c) => c.status === 'LOST')?._count._all ?? 0;
  const abandoned = sessionCounts.find((c) => c.status === 'ABANDONED')?._count._all ?? 0;
  const totalPlays = wins + losses + abandoned;
  const winRate = totalPlays === 0 ? 0 : Math.round((wins / totalPlays) * 100);

  const displayName = user.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Hey {displayName} 👋</h1>
        <p className="text-muted-foreground">
          {completedCount === 9
            ? "You're a certified rep. Keep sharpening — practice against harder archetypes this week."
            : "Pick up where you left off. You're building toward Certified Rep."}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Training progress</CardTitle>
            <CardDescription>
              {completedCount} of {modules.length} modules complete ({completionPct}%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completionPct} className="h-2" aria-label="Overall progress" />
            {currentModule && (
              <div className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {currentModule.progress?.completedAt ? 'Next module' : 'Current module'}
                  </div>
                  <div className="mt-1 text-base font-semibold">
                    Module {currentModule.orderIndex}: {currentModule.title}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{currentModule.summary}</p>
                </div>
                <Button asChild className="gap-2">
                  <Link href={`/modules/${currentModule.slug}`}>
                    {currentModule.progress?.startedAt ? 'Continue' : 'Start'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roleplay stats</CardTitle>
            <CardDescription>
              Last 7 days: {lastWeekSessions} session{lastWeekSessions === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Win rate</span>
              <span className="text-2xl font-bold">{winRate}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">All-time wins</span>
              <span className="text-lg font-semibold">{wins}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Walked / ended</span>
              <span className="text-lg font-semibold">{losses + abandoned}</span>
            </div>
            <Button asChild variant="outline" className="mt-2 w-full gap-2">
              <Link href="/roleplay">
                <MessageSquare className="h-4 w-4" /> Practice
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentAch.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a module or win a roleplay to earn your first badge.
              </p>
            ) : (
              <ul className="space-y-2">
                {recentAch.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {a.slug
                        .replaceAll('_', ' ')
                        .toLowerCase()
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(a.earnedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="w-full gap-2">
              <Link href="/profile">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Leaderboard snapshot</CardTitle>
              <CardDescription>Closers rise.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/leaderboard">
                Full board <Trophy className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="divide-y">
            {leaderboard.length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">
                No one's on the board yet. Be first.
              </p>
            )}
            {leaderboard.map((r) => (
              <div key={r.userId} className="flex items-center justify-between py-2 text-sm">
                <div className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-muted-foreground">
                    {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                  </span>
                  <span className="font-medium">{r.name}</span>
                  {r.userId === user.id && <Badge variant="outline">You</Badge>}
                </div>
                <span className="font-semibold">{r.score}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Last login
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You were last active {relativeTime(new Date())}.
        </CardContent>
      </Card>
    </div>
  );
}
