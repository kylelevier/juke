# JUKE Onboarding Design — Alpha
*Research-backed. June 2026.*

---

## Guiding Principles

1. **Get to the aha moment fast.** Average SaaS TTV is 36 hours — teen attention span is much shorter. Every screen before value is a dropout risk.
2. **3 screens max for setup.** Users are 3× more likely to abandon if registration exceeds 3 screens.
3. **Personalize immediately.** 65% of users return to apps that feel personalized on first use.
4. **Progressive profiling.** Collect only what's needed to unlock value now. Ask for more later.
5. **Segment from the start.** Athletes and coaches have different jobs-to-be-done. The experience should diverge at login.

---

## User 1 — Athlete (teenage girl, 14–18)

### Who she is
Gen Z. Highly visual. Aware of manipulative design — she won't trust an app that feels like it's using her. Her emotional drivers are identity, belonging, and a sense of control over her future. Frustration or confusion = instant close.

### Her job-to-be-done
"Help me figure out which schools actually want someone like me, and show me what to do next."

### Aha moment
**She sees schools matched to her — and saves one to her board.**
That's the moment the product clicks: it's not a generic database, it's *her* list.

### Onboarding milestones

| # | Milestone | Trigger |
|---|-----------|---------|
| M0 | Account created | Google OAuth complete → redirected to athlete portal |
| M1 | Quick Start answered | 3 questions: sport, grad year, division target → finder filtered to her |
| M2 | First school saved *(aha moment)* | She taps "Save" on any finder result |
| M3 | Board viewed | She navigates to Boards tab and sees her saved school |
| M4 | Profile 40%+ complete | Photo + sport + grad year + one highlight |

### Onboarding flow

```
Login → [Quick Start modal, 3 Qs] → Find tab (pre-filtered) → nudge to save a school → Board tab tour
```

**Quick Start questions (shown once, dismissible after M2):**
1. What sport do you play? *(dropdown)*
2. When do you graduate? *(year picker)*
3. What division are you targeting? *(D1 / D2 / D3 / NAIA / Not sure)*

These answers immediately filter the finder. She lands on a list that already feels relevant.

### Design rules for her
- No walls of text. Labels, icons, one-line descriptions.
- Never ask for GPA, test scores, or video links in onboarding. Progressive.
- Empty states coach her — they don't just say "nothing here yet."
- Progress is visible (profile completeness bar, board count).
- Language is warm, not corporate. "Your list" not "Your pipeline."

---

## User 2 — Coach (college or HS, 20–55, male/female)

### Who they are
Busy. Managing multiple athletes, spreadsheets, DMs, and email chains across platforms. Skeptical of new tools — they've been burned before. They don't browse platforms looking for athletes; they want their existing workflow to get easier.

### Their job-to-be-done
"Show me where my athletes are in the process and tell me what I need to do today."

### Aha moment
**They see their athlete roster organized by stage — with a clear next action visible.**
That's when it clicks that JUKE is better than the spreadsheet.

### Onboarding milestones

| # | Milestone | Trigger |
|---|-----------|---------|
| M0 | First login | juke_auth set, portal loaded |
| M1 | School + sport confirmed | Setup step complete (shown once) |
| M2 | First athlete added *(aha moment)* | Athlete card appears on the board |
| M3 | First stage move | Athlete dragged or advanced to next stage |
| M4 | First communication logged | Note, email, or contact entry saved |

### Onboarding flow

```
Login → [Setup step: school + sport confirmed] → Board tab (empty state + Add Athlete CTA) → add first athlete → Today tab populates
```

**Setup step (shown once):**
1. Confirm your school name *(pre-filled from juke_auth if available)*
2. What sport do you coach? *(dropdown)*

That's it. Get them to the board immediately.

### Design rules for coaches
- Empty board must not look broken — it should look like an invitation.
- "Add Athlete" is the only primary CTA until M2 is hit.
- After first athlete added, the Today tab should immediately show something useful.
- Don't ask for contact info, eligibility details, or recruiting notes in onboarding. Progressive.
- Time-respect: if it takes more than 2 minutes to see value, they won't come back.

---

## Shared Principles

### Empty states are onboarding
Every empty state in the app is an onboarding moment. They should:
- Name the value of what goes here
- Give one clear action to fill it
- Never just say "No data" or "Nothing yet"

### Milestone tracking
Track completion of each milestone in `localStorage` (flag: `juke_onboarding`) for alpha. This tells us where people drop off.

```js
// Example flags
juke_onboarding: {
  quickStartDone: false,
  firstSchoolSaved: false,
  boardViewed: false,
  profileStarted: false
}
```

### First-session goal
Every user should hit their aha moment (M2) in their first session. If they don't, they probably won't return.

---

## What's Already Built vs. What's Needed

### Already built ✅
- Google OAuth login + role routing
- Finder with fit scores and filters
- Board with stage columns and drag-drop
- Profile wizard (multi-step)
- Empty states with coaching messages (prior sprint)
- Coach board with COACH_PIPELINE_STAGES
- Today tab (coach portal)

### Needs to be built for Alpha 🔨
See task list — organized by user type and priority.
