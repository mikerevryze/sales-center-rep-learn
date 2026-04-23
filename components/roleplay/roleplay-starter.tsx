'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Props {
  variant: 'random' | 'specific';
  archetypeSlug?: string;
}

export function RoleplayStarter({ variant, archetypeSlug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roleplay/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archetypeSlug ? { archetypeSlug } : {}),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to start');
      }
      const data = (await res.json()) as { sessionId: string };
      router.push(`/roleplay/${data.sessionId}`);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  if (variant === 'random') {
    return (
      <Button size="lg" onClick={handleStart} disabled={loading} className="gap-2">
        <Phone className="h-4 w-4" />
        {loading ? 'Dialing…' : 'Start a cold call'}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={handleStart} disabled={loading} className="gap-1">
      <Phone className="h-3 w-3" />
      {loading ? 'Dialing…' : 'Start'}
    </Button>
  );
}
