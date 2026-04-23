import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// Singleton Anthropic client. Server-only — never import from a Client Component.
export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = env.ANTHROPIC_MODEL;

// Sentinel tokens the roleplay lead emits to signal the end of a session.
export const LEAD_CLOSED_TOKEN = '[LEAD_CLOSED]';
export const LEAD_WALKED_TOKEN = '[LEAD_WALKED]';

/**
 * Strip sentinel tokens from a message before it's shown to the rep — the
 * tokens are for state machine consumption, not for display.
 */
export function stripSentinels(content: string): string {
  return content.replaceAll(LEAD_CLOSED_TOKEN, '').replaceAll(LEAD_WALKED_TOKEN, '').trim();
}

export function detectOutcome(content: string): 'WON' | 'LOST' | null {
  if (content.includes(LEAD_CLOSED_TOKEN)) return 'WON';
  if (content.includes(LEAD_WALKED_TOKEN)) return 'LOST';
  return null;
}
