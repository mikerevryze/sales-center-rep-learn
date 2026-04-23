import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireManagerOrAdmin } from '@/lib/auth-helpers';
import { getAdminAnalytics } from '@/lib/admin';
import { loadArchetypes } from '@/lib/content';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Analytics' };

export default async function AnalyticsPage() {
  await requireManagerOrAdmin();
  const [analytics, modules, archetypes] = await Promise.all([
    getAdminAnalytics(),
    prisma.module.findMany({ orderBy: { orderIndex: 'asc' } }),
    loadArchetypes(),
  ]);

  const archetypeNameBySlug = new Map(archetypes.map((a) => [a.slug, a.name]));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
      </Button>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Team-wide training signals. Use to diagnose where reps are stuck.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total users" value={analytics.totalUsers} />
        <StatCard label="Total modules" value={analytics.totalModules} />
        <StatCard
          label="Total module completions"
          value={analytics.moduleCompletionByModuleId.reduce((s, r) => s + r._count._all, 0)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module completion funnel</CardTitle>
          <CardDescription>How many reps have finished each module.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {modules.map((m) => {
            const row = analytics.moduleCompletionByModuleId.find((r) => r.moduleId === m.id);
            const count = row?._count._all ?? 0;
            const pct =
              analytics.totalUsers === 0 ? 0 : Math.round((count / analytics.totalUsers) * 100);
            return (
              <div key={m.id} className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">
                  M{m.orderIndex} · {m.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {count} rep{count === 1 ? '' : 's'} · {pct}%
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most-failed quiz questions</CardTitle>
          <CardDescription>
            Ranked by wrong-answer volume. If a question dominates this list, the module content may
            need a pass.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {analytics.mostFailedQuizzes.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No quiz attempts yet.</p>
          )}
          {analytics.mostFailedQuizzes.map((q, i) => (
            <div key={q.questionId} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <div className="font-mono text-xs text-muted-foreground">#{i + 1}</div>
                <div className="mt-1 leading-relaxed">{q.prompt}</div>
              </div>
              <Badge variant="destructive">{q.wrongCount} wrong</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Archetype difficulty</CardTitle>
          <CardDescription>
            Pass rate per archetype. Flag anything wildly easy (&gt; 90%) or wildly hard (&lt; 15%).
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {analytics.archetypeStats.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No roleplay sessions yet.</p>
          )}
          {analytics.archetypeStats
            .sort((a, b) => b.total - a.total)
            .map((a) => (
              <div key={a.slug} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{archetypeNameBySlug.get(a.slug) ?? a.slug}</span>
                <span className="text-muted-foreground">
                  {a.wins}/{a.total} wins · {a.passRate}% pass
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}
