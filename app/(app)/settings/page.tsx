import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardVisibilityToggle } from '@/components/settings/leaderboard-visibility-toggle';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const fresh = await prisma.user.findUnique({
    where: { id: user.id },
    select: { hideFromLeaderboard: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Control how you appear on the platform.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Leaderboard visibility</CardTitle>
          <CardDescription>
            If opted out, your name won't appear on the public leaderboard shown to other reps.
            Managers and admins will still see you for coaching purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardVisibilityToggle initial={fresh?.hideFromLeaderboard ?? false} />
        </CardContent>
      </Card>
    </div>
  );
}
