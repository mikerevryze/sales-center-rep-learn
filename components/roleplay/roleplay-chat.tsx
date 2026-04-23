'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Send, User2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'REP' | 'LEAD';
  content: string;
  pending?: boolean;
}

interface Props {
  sessionId: string;
  archetype: { name: string; difficulty: 'easy' | 'medium' | 'hard' };
  scenario: { firstName: string; lastName: string; age: number; city: string; state: string };
  initialMessages: Array<{ id: string; role: 'REP' | 'LEAD'; content: string }>;
}

const MAX_TURNS = 40;
const MAX_CHARS = 2000;

export function RoleplayChat({ sessionId, archetype, scenario, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [endingDialogOpen, setEndingDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const repCount = messages.filter((m) => m.role === 'REP').length;
  const turnsLeft = MAX_TURNS - repCount;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Esc → open end-session confirm
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setEndingDialogOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    if (trimmed.length > MAX_CHARS) {
      toast.error(`Message too long (max ${MAX_CHARS} characters).`);
      return;
    }

    const optimisticRep: Message = {
      id: `tmp-${Date.now()}`,
      role: 'REP',
      content: trimmed,
    };
    const optimisticLead: Message = {
      id: `tmp-lead-${Date.now()}`,
      role: 'LEAD',
      content: '',
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticRep, optimisticLead]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`/api/roleplay/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.status === 410) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.warning(data?.error ?? 'Turn limit reached');
        router.push(`/roleplay/${sessionId}/results`);
        return;
      }
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Lead response failed');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let done = false;
      let redirectTo: string | null = null;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n').filter(Boolean);
        for (const evt of events) {
          const line = evt.trim().replace(/^data:\s*/, '');
          if (!line) continue;
          try {
            const payload = JSON.parse(line) as {
              delta?: string;
              done?: boolean;
              outcome?: 'WON' | 'LOST';
              redirectTo?: string;
              error?: string;
            };
            if (payload.error) throw new Error(payload.error);
            if (payload.delta) {
              accumulated += payload.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === optimisticLead.id ? { ...m, content: accumulated, pending: false } : m,
                ),
              );
            }
            if (payload.done) {
              done = true;
              if (payload.redirectTo) redirectTo = payload.redirectTo;
            }
          } catch (err) {
            console.warn('Malformed event', line);
            if (err instanceof Error && err.message) throw err;
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticLead.id ? { ...m, pending: false } : m)),
      );

      if (redirectTo) {
        toast.message('Call ended — loading your scorecard…');
        router.push(redirectTo);
      }
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send');
      setMessages((prev) =>
        prev.filter((m) => m.id !== optimisticRep.id && m.id !== optimisticLead.id),
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function endSession() {
    setEnding(true);
    try {
      const res = await fetch(`/api/roleplay/${sessionId}/end`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'Failed to end');
      }
      router.push(`/roleplay/${sessionId}/results`);
    } catch (err) {
      toast.error((err as Error).message);
      setEnding(false);
      setEndingDialogOpen(false);
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-10rem)] max-w-3xl flex-col gap-4">
      <Card className="flex-shrink-0">
        <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
              <User2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">
                {scenario.firstName} {scenario.lastName}
              </div>
              <div className="text-xs text-muted-foreground">
                {scenario.age} · {scenario.city}, {scenario.state} · {archetype.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" aria-label={`${turnsLeft} turns remaining`}>
              {turnsLeft} turns left
            </Badge>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEndingDialogOpen(true)}
              className="gap-1"
              aria-label="End call"
            >
              <PhoneOff className="h-4 w-4" />
              End call
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 md:px-6"
          aria-live="polite"
          role="log"
        >
          <ol className="space-y-4">
            {messages.length === 0 && (
              <li className="text-center text-sm text-muted-foreground">Starting the call…</li>
            )}
            {messages.map((m) => (
              <li
                key={m.id}
                className={cn('flex gap-3', m.role === 'REP' ? 'justify-end' : 'justify-start')}
              >
                {m.role === 'LEAD' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary">
                    <User2 className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm',
                    m.role === 'REP'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm bg-muted text-foreground',
                  )}
                >
                  {m.pending && !m.content ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </span>
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === 'REP' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        <CardContent className="border-t pt-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
            aria-label="Message composer"
          >
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Say something… (Enter to send, Shift+Enter for new line, Esc to end call)"
              maxLength={MAX_CHARS}
              rows={2}
              disabled={sending}
              aria-label="Your message"
              className="flex-1 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              className="h-auto"
              disabled={sending || input.trim().length === 0}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {input.length} / {MAX_CHARS}
          </div>
        </CardContent>
      </Card>

      <Dialog open={endingDialogOpen} onOpenChange={setEndingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End this roleplay?</DialogTitle>
            <DialogDescription>
              Ending now will mark the session as abandoned. Your transcript will be graded and
              saved to your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEndingDialogOpen(false)} disabled={ending}>
              Keep going
            </Button>
            <Button variant="destructive" onClick={endSession} disabled={ending}>
              {ending ? 'Ending…' : 'End call'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
