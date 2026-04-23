'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { BookCheck, CheckCircle2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { markModuleReadAction } from '@/app/(app)/modules/actions';

interface Props {
  moduleId: string;
  moduleSlug: string;
  hasReadMark: boolean;
  completed: boolean;
}

export function ModuleReadActions({ moduleId, moduleSlug, hasReadMark, completed }: Props) {
  const [isPending, startTransition] = useTransition();

  const handleMarkRead = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set('moduleId', moduleId);
      const result = await markModuleReadAction(fd);
      if (result.ok) {
        toast.success('Marked as read — time for the quiz.');
      } else {
        toast.error(result.error ?? 'Failed to mark read');
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {completed ? (
        <Button variant="outline" className="gap-2" disabled>
          <CheckCircle2 className="h-4 w-4" /> Module complete
        </Button>
      ) : hasReadMark ? (
        <Button variant="outline" className="gap-2" disabled>
          <BookCheck className="h-4 w-4" /> Marked as read
        </Button>
      ) : (
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleMarkRead}
          disabled={isPending}
          aria-label="Mark module as read"
        >
          <BookCheck className="h-4 w-4" />
          {isPending ? 'Marking…' : 'Mark as read'}
        </Button>
      )}
      <Button asChild className="gap-2">
        <Link href={`/modules/${moduleSlug}/quiz`}>
          <ListChecks className="h-4 w-4" />
          {completed ? 'Retake quiz' : 'Take quiz'}
        </Link>
      </Button>
    </div>
  );
}
