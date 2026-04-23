import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleEditor } from '@/components/admin/role-editor';
import { requireManagerOrAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { formatDateTime, relativeTime } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  return { title: user?.name ?? user?.email ?? 'User' };
}

export default async function AdminUserDetail({ params }: { params: Promise<{ userId: string }> }) {
  const viewer = await requireManagerOrAdmin();
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) notFound();

  const [progress, attempts, sessions] = await Promise.all([
    prisma.moduleProgress.findMany({
      where: { userId },
      include: { module: true },
      orderBy: { module: { orderIndex: 'asc' } },
    }),
    prisma.quizAttempt.findMany({
      where: { userId },
      include: { module: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.roleplaySession.findMany({
      where: { userId },
      include: { evaluation: true },
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
  ]);

  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to users
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? user.email} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{user.name ?? '—'}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge
                variant={
                  user.role === 'ADMIN'
                    ? 'default'
                    : user.role === 'MANAGER'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {user.role}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last active {relativeTime(user.lastActiveAt)}
              </span>
            </div>
          </div>
        </div>
        {viewer.role === 'ADMIN' && (
          <RoleEditor userId={user.id} currentRole={user.role} isSelf={user.id === viewer.id} />
        )}
      </header>

      <Tabs defaultValue="progress">
        <TabsList>
          <TabsTrigger value="progress">Module progress</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz attempts</TabsTrigger>
          <TabsTrigger value="roleplays">Roleplays</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-2">
          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>
                {progress.filter((p) => p.completedAt).length} of {progress.length} complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {progress.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No progress yet.</p>
              )}
              {progress.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-sm font-medium">
                      M{p.module.orderIndex} · {p.module.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started {formatDateTime(p.startedAt)}
                      {p.completedAt && ` · Completed ${formatDateTime(p.completedAt)}`}
                    </div>
                  </div>
                  {p.completedAt ? (
                    <Badge variant="success">
                      {p.quizScore != null && `${p.quizScore} correct · `}Complete
                    </Badge>
                  ) : (
                    <Badge variant="warning">In progress</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quizzes">
          <Card>
            <CardHeader>
              <CardTitle>Quiz attempts</CardTitle>
              <CardDescription>Latest 50.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {attempts.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No quiz attempts.</p>
              )}
              {attempts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">
                      M{a.module.orderIndex} · {a.module.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(a.createdAt)}
                    </div>
                  </div>
                  <Badge variant={a.passed ? 'success' : 'destructive'}>
                    {a.score}/{a.totalQuestions} {a.passed ? '· pass' : '· fail'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roleplays">
          <Card>
            <CardHeader>
              <CardTitle>Roleplay sessions</CardTitle>
              <CardDescription>Latest 50.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y">
              {sessions.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No roleplay sessions.</p>
              )}
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <div className="font-medium">{s.archetypeSlug}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(s.startedAt)} · turns {s.turnCount}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        s.status === 'WON'
                          ? 'success'
                          : s.status === 'LOST'
                            ? 'destructive'
                            : 'outline'
                      }
                    >
                      {s.status}
                    </Badge>
                    {s.evaluation && (
                      <Badge variant={s.evaluation.overallPass ? 'success' : 'destructive'}>
                        {s.evaluation.overallPass ? 'Pass' : 'Needs work'}
                      </Badge>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/roleplay/${s.id}/results`}>Open</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
