'use client';

import * as Icons from 'lucide-react';
import type { ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { ACHIEVEMENT_LIST, type AchievementSlug } from '@/lib/achievements';

type IconComp = ComponentType<{ className?: string }>;

interface EarnedAchievement {
  slug: string;
  earnedAt: Date | string;
}

interface Props {
  earned: EarnedAchievement[];
}

export function AchievementGrid({ earned }: Props) {
  const earnedMap = new Map(earned.map((e) => [e.slug, e]));

  return (
    <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {ACHIEVEMENT_LIST.map((a) => {
        const e = earnedMap.get(a.slug);
        const unlocked = !!e;
        const Icon = ((Icons as unknown as Record<string, IconComp>)[a.icon] ??
          (Icons as unknown as Record<string, IconComp>).Award) as IconComp;
        return (
          <li key={a.slug}>
            <Card
              className={cn(
                'transition-opacity',
                !unlocked && 'opacity-50 grayscale',
                unlocked && 'border-success/30 bg-success/5',
              )}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <div
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
                    unlocked ? 'bg-success text-success-foreground' : 'bg-muted',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-tight">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                  {unlocked && (
                    <p className="mt-1 text-xs text-success">Earned {formatDate(e.earnedAt)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

export type { AchievementSlug };
