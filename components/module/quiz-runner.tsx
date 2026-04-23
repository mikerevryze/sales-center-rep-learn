'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { submitQuizAction, type QuizSubmitResult } from '@/app/(app)/modules/actions';
import { ConfettiBurst } from '@/components/achievements/confetti-on-win';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  orderIndex: number;
  prompt: string;
  choices: string[];
}

interface Props {
  moduleId: string;
  moduleSlug: string;
  moduleTitle: string;
  questions: Question[];
}

export function QuizRunner({ moduleId, moduleSlug, moduleTitle, questions }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<QuizSubmitResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const allAnswered = useMemo(() => answers.every((a) => a >= 0), [answers]);
  const answered = answers.filter((a) => a >= 0).length;
  const progressPct = Math.round((answered / questions.length) * 100);

  const handleSelect = (qIdx: number, choiceIdx: number) => {
    if (result) return;
    setAnswers((prev) => prev.map((v, i) => (i === qIdx ? choiceIdx : v)));
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      toast.error('Answer every question first.');
      return;
    }
    startTransition(async () => {
      const res = await submitQuizAction({ moduleId, answers });
      if (!res.ok) {
        toast.error(res.error ?? 'Submission failed.');
        return;
      }
      setResult(res);
      if (res.passed) {
        toast.success(`Passed — ${res.score}/${res.totalQuestions}`);
        res.newAchievements?.forEach((slug) => {
          toast.success(`Achievement unlocked: ${slug.replaceAll('_', ' ')}`);
        });
      } else {
        toast.warning(`Not yet — ${res.score}/${res.totalQuestions}. Review and retake.`);
      }
      router.refresh();
    });
  };

  const handleRetake = () => {
    setAnswers(questions.map(() => -1));
    setResult(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {result?.passed && <ConfettiBurst />}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{moduleTitle} — Quiz</h1>
        <p className="text-sm text-muted-foreground">
          Pass with 80% or higher to complete this module. You can retake immediately if you don't
          pass.
        </p>
        {!result && (
          <div className="flex items-center gap-3 pt-2">
            <Progress value={progressPct} className="h-2 max-w-sm" />
            <span className="text-xs text-muted-foreground">
              {answered} of {questions.length} answered
            </span>
          </div>
        )}
      </header>

      {result && <ResultSummary result={result} />}

      <ol className="space-y-4">
        {questions.map((q, qIdx) => {
          const selected = answers[qIdx];
          const feedback = result?.results?.[qIdx];
          return (
            <li key={q.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base leading-snug">
                      <span className="text-muted-foreground">Q{qIdx + 1}.</span> {q.prompt}
                    </CardTitle>
                    {feedback && (
                      <Badge
                        variant={feedback.correct ? 'success' : 'destructive'}
                        className="gap-1"
                      >
                        {feedback.correct ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {feedback.correct ? 'Correct' : 'Incorrect'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <fieldset disabled={!!result}>
                    <legend className="sr-only">Answer choices for question {qIdx + 1}</legend>
                    <div className="space-y-2">
                      {q.choices.map((c, cIdx) => {
                        const isSelected = selected === cIdx;
                        const isCorrectChoice = feedback?.correctIndex === cIdx;
                        const isWrongSelection =
                          feedback && isSelected && !feedback.correct && !isCorrectChoice;
                        return (
                          <label
                            key={cIdx}
                            className={cn(
                              'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                              !result && isSelected && 'border-primary bg-primary/5',
                              !result && !isSelected && 'hover:bg-accent/40',
                              feedback && isCorrectChoice && 'border-success bg-success/10',
                              feedback &&
                                isWrongSelection &&
                                'border-destructive bg-destructive/10',
                              result && !isCorrectChoice && !isWrongSelection && 'opacity-60',
                            )}
                          >
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={cIdx}
                              checked={isSelected}
                              onChange={() => handleSelect(qIdx, cIdx)}
                              className="mt-1"
                              aria-label={`${String.fromCharCode(65 + cIdx)}: ${c}`}
                            />
                            <span className="flex-1 text-sm leading-6">
                              <span className="mr-2 font-mono text-xs text-muted-foreground">
                                {String.fromCharCode(65 + cIdx)}.
                              </span>
                              {c}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  {feedback && (
                    <div className="mt-3 rounded-md border bg-muted/40 p-3 text-sm">
                      <div className="font-medium">Explanation</div>
                      <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-4 z-10">
        <Card className="border-primary/30 shadow-lg">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            {!result ? (
              <>
                <div>
                  <p className="text-sm font-medium">
                    {allAnswered
                      ? 'All questions answered.'
                      : `${answered}/${questions.length} answered`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submit to grade. You can retake if you don't pass.
                  </p>
                </div>
                <Button size="lg" onClick={handleSubmit} disabled={!allAnswered || isPending}>
                  {isPending ? 'Grading…' : 'Submit quiz'}
                </Button>
              </>
            ) : result.passed ? (
              <>
                <div>
                  <CardDescription>
                    {result.score}/{result.totalQuestions} correct. Module complete.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild className="gap-2">
                    <Link href={`/modules/${moduleSlug}`}>Back to module</Link>
                  </Button>
                  <Button asChild className="gap-2">
                    <Link href="/modules">
                      All modules <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <CardDescription>
                    {result.score}/{result.totalQuestions} — need{' '}
                    {Math.ceil(0.8 * questions.length)} to pass.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href={`/modules/${moduleSlug}`}>Re-read</Link>
                  </Button>
                  <Button onClick={handleRetake} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> Retake
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultSummary({ result }: { result: QuizSubmitResult }) {
  const pct =
    result.score != null && result.totalQuestions
      ? Math.round((result.score / result.totalQuestions) * 100)
      : 0;
  return (
    <Card className={result.passed ? 'border-success/40' : 'border-destructive/40'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={result.passed ? 'text-success' : 'text-destructive'}>
            {result.passed ? 'Passed' : 'Not passed'}
          </CardTitle>
          <Badge variant={result.passed ? 'success' : 'destructive'}>
            {result.score}/{result.totalQuestions} · {pct}%
          </Badge>
        </div>
        <CardDescription>
          {result.passed
            ? 'Review the feedback below — lock in the wrong ones for next time.'
            : 'Review the explanations, then retake. You can retake immediately.'}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
