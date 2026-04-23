'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { updateLeaderboardVisibility } from '@/app/(app)/settings/actions';

export function LeaderboardVisibilityToggle({ initial }: { initial: boolean }) {
  const [hidden, setHidden] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const next = !hidden;
    setHidden(next);
    startTransition(async () => {
      const r = await updateLeaderboardVisibility({ hideFromLeaderboard: next });
      if (!r.ok) {
        setHidden(!next);
        toast.error(r.error ?? 'Failed to update');
      } else {
        toast.success(next ? 'Hidden from leaderboard' : 'Visible on leaderboard');
      }
    });
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">
          {hidden ? 'Hidden from public leaderboard' : 'Visible on public leaderboard'}
        </p>
        <p className="text-xs text-muted-foreground">Managers and admins always see you.</p>
      </div>
      <Button variant={hidden ? 'outline' : 'default'} onClick={handleToggle} disabled={isPending}>
        {hidden ? 'Show me' : 'Hide me'}
      </Button>
    </div>
  );
}
