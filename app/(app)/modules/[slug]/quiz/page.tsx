import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QuizRunner } from '@/components/module/quiz-runner';
import { requireUser } from '@/lib/auth-helpers';
import { assertModuleAccessible } from '@/lib/modules';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `Quiz · ${slug}` };
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;

  let mod;
  try {
    ({ module: mod } = await assertModuleAccessible(user.id, slug));
  } catch {
    notFound();
  }

  if (mod.questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">Quiz coming soon</h1>
        <p className="text-muted-foreground">
          This module doesn't have quiz questions yet. Check back after the next content seed.
        </p>
        <Button asChild>
          <Link href={`/modules/${slug}`}>Back to module</Link>
        </Button>
      </div>
    );
  }

  // Only ship what the client legitimately needs — never the correct index.
  const clientQuestions = mod.questions.map((q) => ({
    id: q.id,
    orderIndex: q.orderIndex,
    prompt: q.prompt,
    choices: q.choicesJson as string[],
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/modules/${slug}`} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {mod.title}
          </Link>
        </Button>
        <Badge variant="outline">Module {mod.orderIndex} · Quiz</Badge>
      </div>
      <QuizRunner
        moduleId={mod.id}
        moduleSlug={mod.slug}
        moduleTitle={mod.title}
        questions={clientQuestions}
      />
    </div>
  );
}
