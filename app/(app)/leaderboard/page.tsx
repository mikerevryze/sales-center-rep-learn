import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/lib/auth-helpers';
import { getLeaderboard } from '@/lib/leaderboard';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  const user = await requireUser();
  const forAdmin = user.role === 'ADMIN' || user.role === 'MANAGER';
  const rows = await getLeaderboard({ forAdmin, limit: 10, currentUserId: user.id });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Ranked by (roleplay wins × 1) + (modules completed × 5). Reps who opt out of public
          visibility are {forAdmin ? 'still shown to you as staff' : 'hidden from this list'}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Top 10</CardTitle>
          <CardDescription>
            {rows.length === 0 ? 'No eligible reps yet.' : 'Closers get to the top.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {rows.map((r) => {
            const isMe = r.userId === user.id;
            const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : '';
            return (
              <div
                key={r.userId}
                className={cn(
                  'flex items-center gap-4 py-3',
                  isMe && 'rounded-md bg-primary/5 px-2',
                )}
              >
                <div className="flex w-10 items-center gap-1 font-mono text-sm text-muted-foreground">
                  {medal || `#${r.rank}`}
                </div>
                <Avatar className="h-8 w-8">
                  {r.image && <AvatarImage src={r.image} alt={r.name} />}
                  <AvatarFallback>{r.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.name}
                    {isMe && (
                      <Badge variant="outline" className="ml-2">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.wins} win{r.wins === 1 ? '' : 's'} · {r.modulesCompleted} module
                    {r.modulesCompleted === 1 ? '' : 's'} complete
                  </div>
                </div>
                <div className="text-right text-lg font-bold">{r.score}</div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Complete a module or win a roleplay to appear on the leaderboard.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
