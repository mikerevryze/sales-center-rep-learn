import { notFound, redirect } from 'next/navigation';
import { RoleplayChat } from '@/components/roleplay/roleplay-chat';
import { requireUser } from '@/lib/auth-helpers';
import { loadSession } from '@/lib/roleplay/session';

export const metadata = { title: 'Roleplay session' };

export default async function RoleplaySessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;

  const loaded = await loadSession(sessionId, user.id);
  if (!loaded) notFound();

  if (loaded.session.status !== 'IN_PROGRESS') {
    redirect(`/roleplay/${sessionId}/results`);
  }

  const initialMessages = loaded.session.messages.map((m) => ({
    id: m.id,
    role: m.role as 'REP' | 'LEAD',
    content: m.content,
  }));

  return (
    <RoleplayChat
      sessionId={loaded.session.id}
      archetype={{
        name: loaded.archetype.name,
        difficulty: loaded.archetype.difficulty,
      }}
      scenario={{
        firstName: loaded.scenario.firstName,
        lastName: loaded.scenario.lastName,
        age: loaded.scenario.age,
        city: loaded.scenario.city,
        state: loaded.scenario.state,
      }}
      initialMessages={initialMessages}
    />
  );
}
