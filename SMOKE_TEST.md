# Smoke test — Revryze Sales Training

Run this checklist after every fresh deploy. Takes ~15 minutes. Flag anything that doesn't match the expected result.

**Pre-reqs:**

- The site is deployed and reachable.
- `DATABASE_URL` points at an initialized + seeded DB (`pnpm db:push && pnpm db:seed`).
- At least one email in `SUPER_ADMIN_EMAILS`.
- You have a `@revryze.com` Google account.
- You have a non-Revryze Google account for domain-gate tests.

---

## 1. Auth gate

- [ ] Visit `/` while signed out → redirected to `/signin`.
- [ ] Try to sign in with a **non-revryze.com** Google account → blocked. You land on `/signin/error?error=AccessDenied` or similar.
- [ ] Sign in with your `@revryze.com` account → land on `/dashboard`.
- [ ] If your email is in `SUPER_ADMIN_EMAILS`, check `/admin` works. Otherwise check `/admin` redirects you to `/dashboard`.

## 2. Dashboard + navigation

- [ ] Greeting uses your first name.
- [ ] Current module card shows Module 1.
- [ ] Roleplay stats card shows zeros.
- [ ] Leaderboard snapshot shows empty state or just you.
- [ ] Header nav has Dashboard, Modules, Roleplay, Leaderboard, Profile. Admin only shows for MANAGER/ADMIN.
- [ ] Theme toggle flips between dark and light.
- [ ] Dropdown → Sign out works → lands on `/signin`.

## 3. Modules — progression and locking

- [ ] `/modules` lists 9 modules in order.
- [ ] Modules 2–9 show **Locked** badges with "Complete Module N-1 first".
- [ ] Open Module 1 → markdown renders cleanly, no raw symbols.
- [ ] Click **Mark as read** → success toast, button becomes disabled.
- [ ] Click **Take quiz**. All questions load with 4 choices each.
- [ ] Try to submit without answering every question → toast "Answer every question first."
- [ ] Submit with wrong answers on purpose → fail state, explanations shown, **Retake** button offered.
- [ ] Retake with correct answers (perfect score) → pass state, confetti burst, module shows **Complete**.
- [ ] Back to `/modules` — Module 2 is now unlocked, Module 1 shows green.

## 4. Achievements + streaks

- [ ] Passing Module 1 fires toasts for `MODULE_1_COMPLETE` and (if <24h since starting) `SPEED_TO_LEAD`.
- [ ] Perfect score fires `PERFECTIONIST`.
- [ ] Visit `/profile` → achievement grid shows unlocked entries in color, others greyscaled. Earned date present.
- [ ] Log in on 7 different calendar days (UTC) → `STREAK_7` appears.

## 5. Roleplay — happy path

- [ ] `/roleplay` shows 11 archetypes with difficulty badges.
- [ ] Click **Start a cold call** (random) → a new session loads at `/roleplay/:id` with the lead's opening line streamed/displayed.
- [ ] Header shows name, age, city, archetype. Turn counter shows 40.
- [ ] Type a message, press Enter → your message appears, typing indicator appears, lead response streams in character by character.
- [ ] Press Shift+Enter → newline inserted, message does NOT send.
- [ ] Press Esc → "End this roleplay?" dialog appears.
- [ ] Cancel → dialog closes, session continues.
- [ ] Complete a strong DRIVE pitch (Disarm opener, upfront contract, 2–3 why questions, founding-membership pitch with three-tier price anchor, close with "are you opposed to getting set up today?"). Lead should eventually buy. Page redirects to `/roleplay/:id/results`.
- [ ] Results page shows confetti, pass badge, DRIVE scorecard with per-step yes/partial/no + reasons, transcript tab, feedback tab.

## 6. Roleplay — walkaway path

- [ ] Start a second session. Open with **"Hi, is now a good time?"** — a banned phrase.
- [ ] Push price before asking any questions.
- [ ] Repeat banned phrases ("I totally understand," "I'll email you info").
- [ ] Lead should get shorter and eventually walk with a `[LEAD_WALKED]` token (token is stripped from display).
- [ ] Results page shows: overall FAIL, banned phrases detected list, "needs work" feedback.

## 7. Roleplay — turn limit + end button

- [ ] Start a third session. Press **End call** → confirmation dialog. Confirm → land on `/roleplay/:id/results` with status ABANDONED.
- [ ] Send 40 messages in a single session (via test account) — session auto-ends as ABANDONED.

## 8. Admin dashboard

- [ ] Sign in as ADMIN. Visit `/admin`.
- [ ] User table lists all users with name, email, role, modules completed, win rate, last active.
- [ ] Search box filters by name and email.
- [ ] Click any user → detail page with Module progress / Quiz attempts / Roleplays tabs.
- [ ] Role editor dropdown (ADMIN only): promote a test REP → MANAGER. Toast confirms.
- [ ] Dropdown is disabled for self-demotion.
- [ ] Visit `/admin/analytics`:
  - Module completion funnel shows counts per module.
  - Most-failed quiz questions populates after you've made at least one wrong quiz attempt.
  - Archetype pass rate populates after at least one roleplay.

## 9. Leaderboard visibility

- [ ] `/settings` → toggle "Hide me from leaderboard".
- [ ] `/leaderboard` as another REP → you disappear.
- [ ] `/leaderboard` as ADMIN → you're still visible (with or without a "hidden" marker).

## 10. Certification flow

- [ ] Complete all 9 modules (you can seed this via the admin DB for test purposes: set all `ModuleProgress.completedAt`).
- [ ] Win at least 3 roleplay sessions.
- [ ] Profile page shows a **Certified Revryze Rep** card.
- [ ] Click **Download certificate** → PDF downloads. Open it: shows your name, today's date, certificate ID.

## 11. Rate limiting

- [ ] Send 61 roleplay messages in rapid succession → 61st returns 429 with "Message rate limit reached" and a reset time.
- [ ] Start 41 sessions in 24h → 41st returns 429 with "Daily roleplay session cap reached."

## 12. Security spot-checks

- [ ] Opening DevTools → Network → roleplay stream. Verify no `[LEAD_CLOSED]` / `[LEAD_WALKED]` tokens appear in any response body.
- [ ] View the quiz page source → verify no `correctIndex` values are embedded in the HTML or JSON payload sent to the client.
- [ ] Hit `/api/certificate` without completing all 9 modules → 403.
- [ ] Hit `/api/roleplay/start` signed out → 401.
- [ ] Hit `/admin` as a REP → redirect to `/dashboard`.

## 13. Mobile + accessibility

- [ ] Responsive at 375px width — chat, modules, dashboard all usable.
- [ ] Tab through the quiz — every choice is reachable and activatable via keyboard.
- [ ] Screen reader (VoiceOver / NVDA) announces DRIVE scorecard ratings.

---

If every box is checked, the deploy is green. If any item fails, log the details with:

- URL visited
- Account used (REP/MANAGER/ADMIN)
- Browser + OS
- Network response (status + body)
- Server logs from the deploy (Replit → Logs)
