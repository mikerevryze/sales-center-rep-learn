# Revryze Sales Training

Interactive training platform for Revryze sales reps. Nine-module curriculum, quizzes with strict progression, streaming-Claude roleplay against eleven customer archetypes, automated DRIVE-rubric evaluation, achievements, leaderboard, admin dashboard, and PDF certification.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind + shadcn/ui · Prisma + Postgres · NextAuth v5 (Google SSO) · Anthropic Claude (`claude-sonnet-4-6`).

---

## Quick start (local)

```bash
pnpm install
cp .env.example .env        # then fill in the secrets
pnpm db:push                # creates tables
pnpm db:seed                # loads modules + quiz questions from /content
pnpm dev                    # http://localhost:3000
```

The first `@revryze.com` Google account to sign in becomes a REP by default. To bootstrap an admin, add your email to `SUPER_ADMIN_EMAILS` **before** first sign-in.

---

## Environment variables

All are required. See `.env.example` for the full list with inline notes.

| Variable                                    | Where to get it                                                                                                                                                             |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                              | Replit → Tools → Database (Postgres). Neon as fallback: create a project at neon.tech, copy the **pooled** connection string.                                               |
| `NEXTAUTH_SECRET`                           | Run `openssl rand -base64 32` to generate.                                                                                                                                  |
| `NEXTAUTH_URL`                              | Public URL of the app (e.g. `https://yourapp.replit.app`).                                                                                                                  |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web application). Authorized redirect URI must be `{NEXTAUTH_URL}/api/auth/callback/google`. |
| `ANTHROPIC_API_KEY`                         | https://console.anthropic.com → API Keys.                                                                                                                                   |
| `ANTHROPIC_MODEL`                           | Optional override. Default: `claude-sonnet-4-6`.                                                                                                                            |
| `SUPER_ADMIN_EMAILS`                        | Comma-separated list of `@revryze.com` emails auto-promoted to ADMIN on first sign-in.                                                                                      |
| `ALLOWED_EMAIL_DOMAIN`                      | Defaults to `revryze.com`. Only this domain can sign in.                                                                                                                    |

---

## Scripts

| Script                         | What it does                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`                     | Next.js dev server on port 3000.                                                |
| `pnpm build`                   | Production build. Runs `prisma generate` first.                                 |
| `pnpm start`                   | Production server.                                                              |
| `pnpm typecheck`               | `tsc --noEmit` — strict mode, strict null checks.                               |
| `pnpm lint`                    | Next.js / ESLint.                                                               |
| `pnpm format` / `format:check` | Prettier.                                                                       |
| `pnpm db:push`                 | Syncs Prisma schema to the DB without a migration (great for first-time setup). |
| `pnpm db:migrate`              | Creates + applies a named migration. Use this as the project matures.           |
| `pnpm db:deploy`               | Applies pending migrations (production).                                        |
| `pnpm db:seed`                 | Loads markdown modules + JSON quizzes into the DB.                              |
| `pnpm db:studio`               | Prisma Studio at http://localhost:5555.                                         |

---

## Content structure

Content lives in `/content` so training material can be edited without a database migration.

```
content/
├── modules/          # 9 markdown files (01-…md through 09-…md)
├── quizzes/          # 9 JSON files, one per module slug, 10 questions each
└── archetypes/       # 11 JSON files, one per roleplay archetype
```

**To add a module**, create a markdown file with frontmatter:

```md
---
slug: my-new-module
title: My New Module
summary: One-sentence description.
orderIndex: 10
isFinal: false
---

# Content here…
```

Then `pnpm db:seed` to load it.

**To add an archetype**, drop a JSON file in `content/archetypes/`. Required shape is enforced by Zod in `lib/content.ts` — see existing files for the template. Archetypes are loaded at request time, no re-seed required.

**To edit quiz questions**, update the corresponding `content/quizzes/<slug>.json` and re-run `pnpm db:seed`. Questions are replaced wholesale on each seed.

---

## Roleplay architecture

1. Rep clicks **Start**. `POST /api/roleplay/start` loads the archetype and calls Claude once to generate session-specific details (name, age, city, specific injury, dollar concern, etc.) so reps can't memorize between sessions.
2. A `RoleplaySession` row stores the scenario. The archetype's opening line is saved as the first `RoleplayMessage` (role = LEAD).
3. Rep types. `POST /api/roleplay/:id/message` streams Claude via SSE. The streamed text is shown to the user and accumulated server-side. Sentinel tokens `[LEAD_CLOSED]` / `[LEAD_WALKED]` are stripped before streaming and used to detect end-of-call.
4. On end — either token detected, 40-turn cap hit, or user pressed **End call** — `endSession()` transitions status, runs a separate Claude call (`lib/roleplay/evaluator.ts`) with a DRIVE-rubric system prompt, parses the JSON, and writes the `RoleplayEvaluation`.
5. Achievement hooks fire (FIRST_CLOSE, DRIVE_MASTERY, etc.).

**Rate limiting:** 60 messages/user/hour, 40 sessions/user/day. Enforced in the API routes, backed by the `RateLimitHit` table.

---

## Deploy: Replit

1. **Push this repo to GitHub** (or the Revryze GitHub organization).
2. **Create a Replit** → Import from GitHub → select this repo.
3. **Enable Postgres:** Tools → Database → Create database (Replit will inject `DATABASE_URL` automatically as a Secret).
4. **Add the remaining Secrets** (Replit → Secrets) using the keys in `.env.example`. Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
5. **Google OAuth redirect URI:** in Google Cloud Console, add `https://<your-repl>.replit.app/api/auth/callback/google` to the authorized redirect URIs.
6. **Run once to seed the DB:**
   ```
   pnpm db:deploy && pnpm db:seed
   ```
   (or `pnpm db:push && pnpm db:seed` during pre-production if you don't want migration files yet).
7. **Start the server:** Replit's "Run" button uses `pnpm dev` for development. For production deployment use Replit's **Deployments** feature, which runs `pnpm build && pnpm start`.
8. **First sign-in:** your email (listed in `SUPER_ADMIN_EMAILS`) will be auto-promoted to ADMIN on first sign-in. Any other `@revryze.com` user gets `REP` and can be promoted via `/admin`.

### Fallback: Neon Postgres

If Replit's built-in Postgres is unavailable or you want a managed instance:

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (has `-pooler` in the host).
3. Paste into `DATABASE_URL`. Works for both dev and prod.

---

## Deploy: Vercel (compatibility)

The app is Vercel-ready (App Router, edge-safe where applicable, lazy env validation so `next build` doesn't require secrets). Set the environment variables in the Vercel project settings. Use Neon or Supabase for Postgres.

---

## CI

`.github/workflows/ci.yml` runs typecheck + lint + format-check + build on every PR. Dummy env vars are injected so the build can traverse route handlers.

Before committing, husky runs Prettier on staged files. Typecheck runs before every commit.

---

## Security posture

- Server-side role enforcement on every protected route (middleware + `lib/auth-helpers.ts`).
- Zod validation on every API input and content-file load.
- Postgres-backed sliding-window rate limiting on Claude endpoints and quiz submissions to cap API cost exposure.
- Anthropic API key is server-only — all Claude calls flow through Next.js API routes.
- Google SSO is hard-restricted to `@revryze.com` both client-side (via `hd`) and server-side (in the `signIn` callback).
- No stack traces leak to the client; all errors are logged server-side via the structured logger.
- Sentinel tokens (`[LEAD_CLOSED]` / `[LEAD_WALKED]`) are stripped before any content reaches the browser.
- Quiz answers are graded server-side — the client never receives the correct index.
- All user-input markdown is rendered with `rehype-sanitize` defense-in-depth.
- Security headers (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) set via `next.config.mjs`.

---

## Project layout

```
app/
├── (app)/             # authenticated rep app (shared layout)
│   ├── dashboard/
│   ├── modules/
│   ├── roleplay/
│   ├── leaderboard/
│   ├── profile/
│   └── settings/
├── admin/             # MANAGER/ADMIN-only dashboard
├── api/               # route handlers (auth, roleplay, certificate)
├── signin/            # sign-in + error pages (unauthenticated)
└── globals.css
components/
├── ui/                # shadcn primitives
├── layout/, auth/, achievements/, admin/, roleplay/, settings/, module/
lib/
├── auth-helpers.ts    # requireUser/Admin/etc.
├── achievements.ts    # event handlers + catalog
├── claude.ts, env.ts, db.ts, logger.ts, rate-limit.ts
├── modules.ts, leaderboard.ts, admin.ts, content.ts, cert.tsx
└── roleplay/          # prompts, session management, evaluator
content/
├── modules/, quizzes/, archetypes/
prisma/
├── schema.prisma, seed.ts
```
