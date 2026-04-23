---
slug: ghl-mastery
title: GHL Mastery
summary: The working manual for GoHighLevel — what each tool does, when to use it, when not to.
orderIndex: 7
isFinal: false
---

GoHighLevel (GHL) is the CRM where your book of business lives. This module is the working manual: what each tool does, when to use it, and when not to use it. Every section here answers three questions: **what is this, when do I use it, and when do I not use it.**

## Pipeline Stages (Know These Cold)

Every lead sits in one pipeline stage at a time. Your book of business is the union of all the stages. Move leads through them aggressively.

- **NEW LEAD:** filled out form, never contacted by a rep. **Empty this section by 11 AM daily.** First touch = one dial + one text, minimum.
- **ATTEMPTING TO CONTACT:** dialed at least once, no conversation yet. Cadence: dial every 1–2 days, text once.
- **CONNECTED / BRUSHED OFF:** had a brief live conversation but didn't pitch. They're interested enough to pick up; nurture with personality.
- **PITCHED:** you delivered the full DRIVE pitch and they didn't close. These are your highest-intent unclosed leads — rehash them aggressively.
- **CALL SCHEDULED:** booked on your calendar via trigger link. Leave them alone until the call; all automations pause here.
- **NO SHOW:** missed their scheduled call. Follow up same day: "Hey, saw you couldn't make our time — when works better?"
- **CLOSE WON:** sale complete. Update membership details; all automations and AI get removed automatically.
- **CLOSE LOST:** disqualified or refused. Move here immediately — never let dead leads clog your pipeline.

## Smart Lists

Smart Lists are saved filters over your pipeline. They're how you slice your book of business to attack specific segments.

### Use Cases

- **Tracking:** one saved list per pipeline stage for your assigned locations. This is your primary daily view.
- **Mass text:** filter by last-activity date > 5 days + stage = PITCHED to find rehash candidates.
- **Referrals:** filter by stage = CLOSE WON + tag "partner-interested" to stack referral discounts.

### The Owner + Follower Filter Rule

To see every lead assigned to you — including legacy leads where you're listed as a follower rather than owner — set both filters on and leave the boolean as **OR**:

- Owner = Your Name
- Follower = Your Name
- Logic: OR (default)

**Without both filters, you'll miss half your book.** This is how leads go missing.

### When Not to Use

Don't build a Smart List you'll only use once. Use a one-off filter instead. Smart Lists are for daily workflows; one-offs are for ad-hoc work.

## Power Dialer

The Power Dialer runs through a list of leads and auto-dials each one in sequence. This is how you get through a Smart List fast.

### Setup (one-time)

1. Admin creates a personal workflow for each rep: Trigger = Manual, Action = Manual Call.
2. Rep filters a Smart List by stage / pipeline / location.
3. Select leads (or all), click Trigger Automation, choose your workflow, select Send All At Once.
4. Go to Manual Actions tab, sort by your workflow, click Let's Start.
5. The dialer surfaces each lead's texting history as you dial, so you have context before they pick up.

### Use Cases

- **Morning New Lead blitz:** power dial NEW LEAD through your target locations.
- **Afternoon rehash:** power dial PITCHED plus NO SHOW.
- **End-of-day sweep:** power dial ATTEMPTING TO CONTACT.

### When Not to Use

Don't power-dial CALL SCHEDULED leads — they have a booked time; calling twice is rude. Don't power-dial CLOSE WON — they bought.

## Voicemail Drops

A voicemail drop is a pre-recorded audio file that GHL deposits directly into the lead's voicemail without ringing their phone. It counts as a text-message touch for compliance purposes, not a call.

### Setup

1. Automation Lab → Start from Scratch → New Workflow.
2. Name it: `[Your Name]_voicemail_drop`.
3. Trigger: Contact Tag → Tag Added → Create new tag (e.g., "your_name_vm").
4. Add action: Voicemail → Upload pre-recorded audio (**10 seconds, not 30**).
5. Optional: Add Wait 1 minute → Send SMS.
6. Publish workflow.
7. To fire: select leads, Trigger Automation, choose your workflow.

### VM Recording Spec

10 seconds. Neutral. Status-raising. Canonical:

> "Hey, this is [Name] over at [Client]. I saw that you filled out your information — I just wanted to reach out and see how you wanted to proceed."

**Why 10 seconds:** some leads pick up mid-drop because they were screening. If your drop is 30 seconds of rambling, they start talking to a recording, realize it's fake, and ghost. 10 seconds preserves the accidental-callback path.

### Use Cases

- End of day, after live-dialing a batch: VM drop + text catches the no-answers.
- Weekly mass text moment: pair the mass text with a VM drop for a double touchpoint.

### When Not to Use

- Never use for CALL SCHEDULED — they have a booked time.
- Never more than once a week per lead.
- Never drop 100+ at once without drip mode — you'll get 20 callbacks in the first five minutes and can't answer them all. Drip in batches of 20 every 5 minutes.

### Critical Rule

**Never leave a voicemail manually.** When you live-dial and get no answer, hang up — do not leave a VM. People return missed calls without voicemails at a higher rate than missed calls with them. This is counterintuitive and true. The only voicemails going out are scheduled drops.

## Snippets

Snippets are saved text-message templates. You insert them with a keyboard shortcut during SMS composition.

### Use Cases

- Pricing recap: the most common snippet. Customize the location and tier per send.
- Class structure explainer for new brands.
- Grace-period and cancellation text.
- Common objection handles in text form (shorter versions of the talk tracks in Module 6).

### When Not to Use

If the snippet fires for an awkward context (lead just asked a specific question you didn't address), slow down and type. **A wrong-snippet send is worse than no snippet.** Always scan the context before sending.

## Conversation AI Bot

Revryze runs conversational AI bots in every client sub-account to automate first-touch replies and routine Q&A. You don't build them — but you need to know how they interact with your book.

### How the Architecture Works

- A **general bot** runs on autopilot across the sub-account for new leads and early-stage nurture.
- **Stage-specific bots** take over for PITCHED and NO SHOW, with talk tracks tuned for those stages.
- **Bot goes off** in CALL SCHEDULED, CLOSE WON, and CLOSE LOST — human only.

### Turning the Bot On/Off per Lead

In any lead's text screen, click the sparkle icon. You can set the bot to Inactive (24 hours) or Inactive (permanent) for that lead. Use this when the bot is going off-rail on a specific conversation and you want to take over.

### Surveilling Your Book

The bot does not replace rep attention. **Skim your leads' text threads at least twice a day.** If the bot has said something off-brand, off-pricing, or off-tone, turn it off for that lead and correct the conversation. You are still the owner.

### "Are you a bot?" (Transparency script)

> "Yes — we use AI to help manage text volume. We have over 300 people texting us on a daily basis right now and we couldn't get back to everyone in a timely manner without it. But I'm a real person when you call."

The frame: **busy-ness is a proof point that the brand is wanted, not a confession of short-staffing.** This is a status-raising disclosure, not a defensive one.

## Call Disposition Automations

After every call, set the disposition (No Answer, Left Message, Pitched, Booked, etc.). The disposition fires the next step automatically:

- **No Answer** → triggers a follow-up text after 15 minutes.
- **Pitched** → creates an auto-task for follow-up dial in 48 hours.
- **Booked** → moves lead to CALL SCHEDULED stage and pauses all other nurture.

## Local Phone Number Dialing

GHL supports dialing from a number that matches the lead's area code. **Local numbers get 2–3x higher answer rates than out-of-area numbers.** Always dial local when the option is available.

## Tagging for Filters

Tags let you slice your book by attributes the pipeline stages don't capture.

- **Demographic tags** (e.g., `#spanish-speaking` routes to the Spanish-fluent rep).
- **Source tags** (e.g., `#website-form` vs `#meta-ad`) for conversion analysis.
- **Behavioral tags** (e.g., `#high-intent` for leads who self-served through checkout but stalled).

## Checkout Mechanics

Every client runs their own point-of-sale system in parallel with GHL. You are expected to process sales end-to-end in whichever system the client uses — Hapana, Mindbody, or otherwise. Your pod leader will walk you through each one during brand onboarding.

**Universal rules:**

1. Enter the membership at the correct location.
2. Apply the correct discount (100% for grace-period sign-ups, partial for founder rates).
3. Set the charge date to 30 days post-open, not today.
4. Save the card to file.
5. Close the ticket.
6. Return to GHL, move the lead to CLOSE WON, and update the membership details field.

> **Sale audit rule:** if you moved a lead to CLOSE WON but never pressed "Confirm" on the agreement in the POS system, you created a ghost sale — the record looks closed but no payment processed. Every Friday, audit your Close Won for the week: cross-reference the POS records and make sure each one shows an actual payment. If it doesn't, reach back out to the lead immediately.

## Orange Notification Bell

The orange bell at the top of GHL fires in real time for sale events. Keep it in your eyeline. Several reps have caught incremental sales just by watching the bell — someone self-served through checkout, you see the alert, you call to make sure they completed, and you claim the sale.

## Text Composition Rules

Every text you send represents the brand. The voice is: mature, concise, matter-of-fact, with a small amount of warmth (one exclamation, occasional smiley).

- Short sentences.
- Proper capitalization and punctuation.
- No emoji overload.
- No "haha" unless there's a legitimate joke.
- Every text ends with a call to action (a question, a link, or a next-step prompt).

**Test:** read it out loud. Does it sound like a professional who's mildly warm, or a college bro texting? If the latter, rewrite.

## What Not to Do in GHL

- **Do not send mass texts without a filter.** Unfiltered mass texts go to every lead in the sub-account, including Close Won, Close Lost, and other reps' leads.
- **Do not build your own automations without pod leader approval.** Broken workflows can text the entire list.
- **Do not touch anything in the Sub-Account settings or Admin tabs** unless explicitly instructed.

**When in doubt, ask your pod leader or in the sales-center chat before clicking.**
