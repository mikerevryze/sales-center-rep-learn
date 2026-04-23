import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Markdown } from '@/components/markdown';
import { ConfettiBurst } from '@/components/achievements/confetti-on-win';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireUser } from '@/lib/auth-helpers';
import { loadSession } from '@/lib/roleplay/session';
import { relativeTime } from '@/lib/utils';

export const metadata = { title: 'Roleplay results' };

const driveLabels = {
  D: 'Disarm',
  R: 'Reserve the close',
  I: 'Investigate',
  V: 'Value-stack',
  E: 'Execute',
} as const;

const ratingStyles = {
  yes: { className: 'text-success', icon: CheckCircle2, label: 'Yes' },
  partial: { className: 'text-warning', icon: CheckCircle2, label: 'Partial' },
  no: { className: 'text-destructive', icon: XCircle, label: 'No' },
} as const;

export default async function RoleplayResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;

  const loaded = await loadSession(sessionId, user.id);
  if (!loaded) notFound();

  const { session, archetype, scenario } = loaded;

  const evaluation =
    session.status === 'IN_PROGRESS'
      ? null
      : await (async () => {
          const { prisma } = await import('@/lib/db');
          return prisma.roleplayEvaluation.findUnique({ where: { sessionId } });
        })();

  const driveScores = evaluation?.driveScoresJson as Record<
    'D' | 'R' | 'I' | 'V' | 'E',
    { rating: 'yes' | 'partial' | 'no'; reason: string }
  > | null;
  const bannedHits = (evaluation?.bannedPhrasesUsedJson ?? []) as Array<{
    phrase: string;
    quote: string;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {session.status === 'WON' && <ConfettiBurst />}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/roleplay" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            All roleplays
          </Link>
        </Button>
        <Badge variant="outline">
          {session.status === 'WON'
            ? 'Closed'
            : session.status === 'LOST'
              ? 'Walked'
              : session.status === 'ABANDONED'
                ? 'Ended'
                : 'In progress'}
        </Badge>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {scenario.firstName} {scenario.lastName} · {archetype.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {relativeTime(session.startedAt)} ·{' '}
          {session.messages.filter((m) => m.role === 'REP').length} rep messages ·{' '}
          {session.messages.filter((m) => m.role === 'LEAD').length} lead messages
        </p>
      </header>

      {evaluation ? (
        <>
          <Card className={evaluation.overallPass ? 'border-success/40' : 'border-destructive/40'}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle
                    className={evaluation.overallPass ? 'text-success' : 'text-destructive'}
                  >
                    {evaluation.overallPass ? 'Passed' : 'Needs work'}
                  </CardTitle>
                  <CardDescription>
                    {evaluation.overallPass
                      ? 'Strong execution. Save this one as a reference call.'
                      : 'Review the breakdown below and try again with what you learned.'}
                  </CardDescription>
                </div>
                <Badge variant={evaluation.overallPass ? 'success' : 'destructive'}>
                  {session.status === 'WON'
                    ? 'Lead bought'
                    : session.status === 'LOST'
                      ? 'Lead walked'
                      : 'Call ended'}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="scorecard">
            <TabsList>
              <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
              <TabsTrigger value="feedback">Full feedback</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>
            <TabsContent value="scorecard" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>DRIVE breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {driveScores &&
                    (Object.keys(driveLabels) as Array<keyof typeof driveLabels>).map((k) => {
                      const score = driveScores[k];
                      const style = ratingStyles[score.rating];
                      const Icon = style.icon;
                      return (
                        <div
                          key={k}
                          className="flex items-start gap-3 border-b pb-3 last:border-b-0"
                        >
                          <div className={`mt-0.5 ${style.className}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              <span className="mr-2 font-mono text-muted-foreground">{k}</span>
                              {driveLabels[k]}{' '}
                              <Badge variant="outline" className="ml-2">
                                {style.label}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{score.reason}</p>
                          </div>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Objection behind the objection</CardTitle>
                  <CardDescription>
                    {evaluation.objectionBehindObjection
                      ? 'Surfaced the real objection.'
                      : 'Missed the real objection underneath the surface one.'}
                  </CardDescription>
                </CardHeader>
                {evaluation.objectionEvidence && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{evaluation.objectionEvidence}</p>
                  </CardContent>
                )}
              </Card>

              {bannedHits.length > 0 && (
                <Card className="border-destructive/30">
                  <CardHeader>
                    <CardTitle className="text-destructive">Banned phrases detected</CardTitle>
                    <CardDescription>
                      These are conversion-killers. Catch them on your next call.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {bannedHits.map((b, i) => (
                        <li key={i}>
                          <div className="font-medium">{b.phrase}</div>
                          <blockquote className="mt-1 border-l-2 border-destructive/40 pl-3 italic text-muted-foreground">
                            "{b.quote}"
                          </blockquote>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="feedback">
              <Card>
                <CardContent className="pt-6">
                  <Markdown content={evaluation.feedbackMarkdown} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transcript">
              <Card>
                <CardContent className="space-y-3 pt-6">
                  {session.messages
                    .filter((m) => m.role !== 'SYSTEM')
                    .map((m) => (
                      <div key={m.id} className="text-sm">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {m.role === 'REP' ? 'You (rep)' : `${scenario.firstName} (lead)`}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Session still in progress</CardTitle>
            <CardDescription>
              The evaluator only runs after the call ends. Return to the chat to finish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/roleplay/${sessionId}`}>Resume call</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/roleplay">Practice another</Link>
        </Button>
        <Button asChild>
          <Link href={`/roleplay?retry=${archetype.slug}`}>Retry this archetype</Link>
        </Button>
      </div>
    </div>
  );
}
