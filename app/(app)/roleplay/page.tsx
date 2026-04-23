import Link from 'next/link';
import { ArrowRight, Shuffle, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RoleplayStarter } from '@/components/roleplay/roleplay-starter';
import { requireUser } from '@/lib/auth-helpers';
import { loadArchetypes } from '@/lib/content';
import { prisma } from '@/lib/db';
import { relativeTime } from '@/lib/utils';

export const metadata = { title: 'Roleplay' };

export default async function RoleplayIndex() {
  const user = await requireUser();
  const archetypes = await loadArchetypes();

  const [recentSessions, wonByArchetype] = await Promise.all([
    prisma.roleplaySession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: { evaluation: true },
    }),
    prisma.roleplaySession.groupBy({
      by: ['archetypeSlug'],
      where: { userId: user.id, status: 'WON' },
      _count: { _all: true },
    }),
  ]);

  const wonMap = new Map(wonByArchetype.map((w) => [w.archetypeSlug, w._count._all]));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Roleplay practice</h1>
        <p className="text-muted-foreground">
          Cold-call a simulated lead. They will react like a real customer — guarded at first,
          responsive to good discovery, impatient with bad pitches. Run the DRIVE framework. Close
          or walk with dignity.
        </p>
      </header>

      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            <CardTitle>Random practice call</CardTitle>
          </div>
          <CardDescription>
            We'll pick an archetype for you. Best for pressure-testing whether you can run DRIVE
            cold, without preparing for a specific persona.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoleplayStarter variant="random" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Choose a specific archetype</h2>
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {archetypes.map((a) => {
            const wins = wonMap.get(a.slug) ?? 0;
            return (
              <li key={a.slug}>
                <Card className="h-full">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">{a.name}</CardTitle>
                      <DifficultyBadge difficulty={a.difficulty} />
                    </div>
                    <CardDescription className="line-clamp-2">{a.persona}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {wins > 0 ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <Trophy className="h-3 w-3" /> {wins} win{wins === 1 ? '' : 's'}
                        </span>
                      ) : (
                        'Not yet beaten'
                      )}
                    </span>
                    <RoleplayStarter variant="specific" archetypeSlug={a.slug} />
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {recentSessions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Recent sessions</h2>
          <ul className="divide-y rounded-md border">
            {recentSessions.map((s) => {
              const archetype = archetypes.find((a) => a.slug === s.archetypeSlug);
              return (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{archetype?.name ?? s.archetypeSlug}</div>
                    <div className="text-xs text-muted-foreground">
                      {relativeTime(s.startedAt)} <StatusBadge status={s.status} />
                      {s.evaluation && (
                        <span className="ml-2 text-xs">
                          {s.evaluation.overallPass ? 'Pass' : 'Needs work'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" asChild className="gap-1">
                    <Link href={`/roleplay/${s.id}/results`}>
                      Review <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  if (difficulty === 'hard') return <Badge variant="destructive">Hard</Badge>;
  if (difficulty === 'easy') return <Badge variant="success">Easy</Badge>;
  return <Badge variant="secondary">Medium</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const v =
    status === 'WON'
      ? { variant: 'success' as const, label: 'Won' }
      : status === 'LOST'
        ? { variant: 'destructive' as const, label: 'Walked' }
        : status === 'ABANDONED'
          ? { variant: 'outline' as const, label: 'Ended' }
          : { variant: 'warning' as const, label: 'In progress' };
  return (
    <Badge variant={v.variant} className="ml-1">
      {v.label}
    </Badge>
  );
}
