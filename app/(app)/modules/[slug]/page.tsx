import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Markdown } from '@/components/markdown';
import { ModuleReadActions } from '@/components/module/module-read-actions';
import { requireUser } from '@/lib/auth-helpers';
import { assertModuleAccessible, ensureModuleStarted, percentScore } from '@/lib/modules';
import { prisma } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = await prisma.module.findUnique({ where: { slug } });
  return { title: mod?.title ?? 'Module' };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;

  let mod, progress;
  try {
    ({ module: mod, progress } = await assertModuleAccessible(user.id, slug));
  } catch {
    notFound();
  }

  // Auto-start the module on first view so `startedAt` reflects reality.
  await ensureModuleStarted(user.id, mod.id);

  const questionCount = mod.questions.length;
  const passingScore = Math.ceil(questionCount * 0.8);
  const nextMod = await prisma.module.findFirst({
    where: { orderIndex: mod.orderIndex + 1 },
  });

  const done = !!progress?.completedAt;
  const lastPct =
    progress?.quizScore != null && questionCount > 0
      ? percentScore(progress.quizScore, questionCount)
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/modules" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            All modules
          </Link>
        </Button>
        <Badge variant="outline">Module {mod.orderIndex} of 9</Badge>
      </div>

      <header className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">{mod.title}</h1>
        <p className="text-lg text-muted-foreground">{mod.summary}</p>
        {done && (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed{lastPct != null && ` · ${lastPct}% on last quiz`}
          </Badge>
        )}
      </header>

      <Card>
        <CardContent className="pt-6">
          <Markdown content={mod.contentMarkdown} />
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle>Ready for the quiz?</CardTitle>
          <CardDescription>
            {questionCount} question{questionCount === 1 ? '' : 's'} · Pass with {passingScore}/
            {questionCount} ({Math.round((passingScore / Math.max(1, questionCount)) * 100)}%) or
            higher.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <ModuleReadActions
            moduleId={mod.id}
            moduleSlug={mod.slug}
            hasReadMark={!!progress?.readAt}
            completed={done}
          />
          {done && nextMod && (
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/modules/${nextMod.slug}`}>
                Next module
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
