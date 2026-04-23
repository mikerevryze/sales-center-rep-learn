import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';

// Lazy singleton — avoids env validation during `next build` page-data collection.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Proxied Anthropic client: every property access flows through the lazy getter.
 * Callers can use `anthropic.messages.create(...)` as if it were a direct instance.
 */
export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_t, prop) {
    const value = (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(getClient())
      : value;
  },
});

export function getClaudeModel(): string {
  return env.ANTHROPIC_MODEL;
}

// Sentinel tokens the roleplay lead emits to signal the end of a session.
export const LEAD_CLOSED_TOKEN = '[LEAD_CLOSED]';
export const LEAD_WALKED_TOKEN = '[LEAD_WALKED]';

export function stripSentinels(content: string): string {
  return content.replaceAll(LEAD_CLOSED_TOKEN, '').replaceAll(LEAD_WALKED_TOKEN, '').trim();
}

export function detectOutcome(content: string): 'WON' | 'LOST' | null {
  if (content.includes(LEAD_CLOSED_TOKEN)) return 'WON';
  if (content.includes(LEAD_WALKED_TOKEN)) return 'LOST';
  return null;
}
