import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  SUPER_ADMIN_EMAILS: z.string().default(''),
  ALLOWED_EMAIL_DOMAIN: z.string().default('revryze.com'),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

function resolve(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(
      `Invalid environment variables. Check your .env file against .env.example.\n${issues}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/**
 * Lazy env accessor — validates on first property access, not at module import.
 * This lets `next build` traverse route handlers without a populated .env.
 */
export const env = new Proxy({} as Env, {
  get(_target, prop) {
    const e = resolve();
    return e[prop as keyof Env];
  },
});

let superAdminCache: Set<string> | null = null;
export function getSuperAdminEmails(): Set<string> {
  if (superAdminCache) return superAdminCache;
  superAdminCache = new Set(
    resolve()
      .SUPER_ADMIN_EMAILS.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return superAdminCache;
}

export function getAllowedEmailDomain(): string {
  return resolve().ALLOWED_EMAIL_DOMAIN.toLowerCase();
}
