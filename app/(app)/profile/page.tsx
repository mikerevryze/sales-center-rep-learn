import { Award, Download } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementGrid } from '@/components/achievements/achievement-grid';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { ACHIEVEMENT_LIST } from '@/lib/achievements';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const user = await requireUser();
  const [fullUser, achievements, modulesCompleted, sessionCounts] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: 'desc' },
    }),
    prisma.moduleProgress.count({
      where: { userId: user.id, completedAt: { not: null } },
    }),
    prisma.roleplaySession.groupBy({
      by: ['status'],
      where: { userId: user.id },
      _count: { _all: true },
    }),
  ]);

  const wins = sessionCounts.find((c) => c.status === 'WON')?._count._all ?? 0;
  const total = sessionCounts.reduce((s, c) => s + c._count._all, 0);
  const winRate = total === 0 ? 0 : Math.round((wins / total) * 100);
  const certEligible = modulesCompleted === 9;

  const display = user.name ?? user.email ?? 'Rep';
  const initials = display.slice(0, 1).toUpperCase();
  const unlockedCount = achievements.length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user.image && <AvatarImage src={user.image} alt={display} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{display}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{user.role}</Badge>
              {fullUser?.createdAt && (
                <span className="text-xs text-muted-foreground">
                  Joined {formatDate(fullUser.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Modules complete" value={`${modulesCompleted} / 9`} />
        <StatCard label="Roleplay win rate" value={`${winRate}%`} hint={`${wins} of ${total}`} />
        <StatCard label="Achievements" value={`${unlockedCount} / ${ACHIEVEMENT_LIST.length}`} />
      </div>

      {certEligible && (
        <Card className="border-success/40 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              Certified Revryze Rep
            </CardTitle>
            <CardDescription>
              Download your PDF certificate. Share it with your pod leader or keep it for your
              records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <a href="/api/certificate" download>
                <Download className="h-4 w-4" /> Download certificate
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>
            Milestones earned on the platform. Locked cards show what's still available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AchievementGrid earned={achievements} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
