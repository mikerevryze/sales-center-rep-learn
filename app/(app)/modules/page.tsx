import Link from 'next/link';
import { CheckCircle2, Lock, Play, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { requireUser } from '@/lib/auth-helpers';
import { getModulesForUser, percentScore } from '@/lib/modules';

export const metadata = { title: 'Modules' };

export default async function ModulesPage() {
  const user = await requireUser();
  const modules = await getModulesForUser(user.id);

  const completed = modules.filter((m) => m.progress?.completedAt).length;
  const overallPct = Math.round((completed / modules.length) * 100);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Training Modules</h1>
        <p className="text-muted-foreground">
          Nine modules of core curriculum. Each unlocks the next. Read, then pass the quiz with
          ≥80%.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <Progress value={overallPct} className="h-2 max-w-sm" aria-label="Overall progress" />
          <span className="text-sm text-muted-foreground">
            {completed} of {modules.length} complete ({overallPct}%)
          </span>
        </div>
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {modules.map((m) => {
          const done = !!m.progress?.completedAt;
          const inProgress = !!m.progress?.startedAt && !done;
          const pct =
            m.progress?.quizScore != null && m.questionCount > 0
              ? percentScore(m.progress.quizScore, m.questionCount)
              : null;

          return (
            <li key={m.id}>
              <Card
                className={
                  m.locked
                    ? 'opacity-70'
                    : done
                      ? 'border-success/40'
                      : 'transition-colors hover:border-primary/50'
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Module {m.orderIndex}</span>
                        {m.isFinal && (
                          <Badge variant="outline" className="gap-1 font-normal">
                            <GraduationCap className="h-3 w-3" /> Final
                          </Badge>
                        )}
                      </div>
                      <CardTitle>{m.title}</CardTitle>
                      <CardDescription>{m.summary}</CardDescription>
                    </div>
                    <StatusBadge done={done} inProgress={inProgress} locked={m.locked} pct={pct} />
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {m.questionCount} quiz question{m.questionCount === 1 ? '' : 's'}
                    {pct != null && ` · last score ${pct}%`}
                  </div>
                  {m.locked ? (
                    <Button size="sm" disabled variant="outline" className="gap-2">
                      <Lock className="h-4 w-4" />
                      Locked
                    </Button>
                  ) : (
                    <Button size="sm" asChild className="gap-2">
                      <Link href={`/modules/${m.slug}`}>
                        {done ? 'Review' : inProgress ? 'Continue' : 'Start'}
                        <Play className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusBadge({
  done,
  inProgress,
  locked,
  pct,
}: {
  done: boolean;
  inProgress: boolean;
  locked: boolean;
  pct: number | null;
}) {
  if (done) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Complete{pct != null && ` · ${pct}%`}
      </Badge>
    );
  }
  if (locked) {
    return (
      <Badge variant="outline" className="gap-1">
        <Lock className="h-3 w-3" />
        Locked
      </Badge>
    );
  }
  if (inProgress) return <Badge variant="warning">In progress</Badge>;
  return <Badge variant="outline">Not started</Badge>;
}
