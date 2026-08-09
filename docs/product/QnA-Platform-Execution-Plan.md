# QnA Platform — Complete Execution Plan

**Status:** Product roadmap & delivery plan  
**Date:** 2026-08-09  
**Audience:** Product owners, mentors, engineering  
**Goal:** Evolve the current assessment ops shell into a **credible learning & assessment platform** with a natural QnA loop, an admin workbench that drives decisions, and a clear business story for demos and stakeholders.

---

## 1. Executive summary

### What we have today
A working **formal quiz pipeline**:
Admin drafts → authors MCQ/TF → publishes → bulk-invites → tracks invitations → morning follow-up list.  
Student accepts invite → dashboard → gateway → attempt (autosave) → submit → score stored.

### What’s wrong
The product optimizes for **state machines and access control**, not for **ask → answer → understand → coach**. After submit, the learning loop dies. Admin cannot see results or act from one place. Invites often fail in practice (simulated email, no copyable link). The experience feels robotic and unfinished.

### What we will build
A **two-sided platform**:

| Side | Job to be done |
|------|----------------|
| **Learner** | Enter a fair, timed assessment; leave knowing how they did and what to fix |
| **Instructor / Ops** | Launch cohorts, monitor completion, review integrity, coach at-risk learners, prove outcomes |

### North-star product sentence
> **QnA is the assessment layer for training programs:** invite a cohort, run a fair timed quiz, show results that teach, and give instructors one morning workbench to chase, review, and prove learning outcomes.

---

## 2. Business model & presentation edge

This section is written so demos and stakeholder talks can lead with **value**, not features.

### 2.1 Problem in the market
Training and academy programs still run assessments in three broken ways:

1. **Forms / Google Forms** — easy to send, zero integrity, weak results coaching  
2. **LMS quiz modules** — heavy, slow to set up, poor follow-up UX  
3. **Spreadsheets + email** — instructors chase manually; no single source of truth  

Operators need: **fast launch → fair attempt → clear outcomes → actionable follow-up**.

### 2.2 Positioning
**Category:** Cohort assessment & learning-outcomes workbench  
**Not:** Generic chatbot, full LMS, or proctoring suite  

**Positioning line (demo opener):**
> We don’t replace your LMS. We replace the painful last mile — invite, sit, score, chase, prove.

**Differentiation vs Forms / LMS quiz:**

| Capability | Forms | Typical LMS | QnA (target) |
|------------|-------|-------------|--------------|
| 10-minute cohort launch | ✅ | ❌ | ✅ |
| Attempt lock + snapshot fairness | ❌ | Partial | ✅ |
| Server-side timer / auto-submit | ❌ | Partial | ✅ |
| Results that teach (review + explanations) | ❌ | Weak | ✅ |
| Morning follow-up workbench | ❌ | ❌ | ✅ |
| Integrity signals without false accusation | ❌ | Rare | ✅ |
| Optional knowledge grounding (docs → questions/hints) | ❌ | Rare | Roadmap ✅ |

### 2.3 Who pays / who uses (business model)

**Primary buyer:** Training academies, bootcamps, corporate L&D, cohort program operators  
**Primary users:**
- **Admin / Instructor** — creates quizzes, invites, reviews outcomes  
- **Learner / Student** — sits assessments, sees results  

**Monetization options (pick one primary story for demos; keep others as expansion):**

| Model | How it works | When it fits |
|-------|--------------|--------------|
| **Per-seat SaaS (recommended demo story)** | Monthly fee per active learner seat in a workspace | Academies with recurring cohorts |
| **Per-cohort / assessment pack** | Pay per published quiz × enrolled learners | Occasional corporate assessments |
| **Workspace + add-ons** | Base platform + Integrity + Knowledge Pack (RAG) + Exports | Upsell after core adoption |

**Demo pricing narrative (illustrative, not final):**
- **Starter** — 1 admin, 50 seats, quizzes + invites + results  
- **Growth** — multi-admin, follow-up actions, integrity review, CSV export  
- **Program** — SSO later, knowledge docs → question assist, API access  

### 2.4 Value metrics (what buyers care about)
Lead every stakeholder slide with **outcomes**, not screens:

1. **Completion rate** — invited → submitted  
2. **Time-to-launch** — draft to first invite (target: &lt; 15 minutes)  
3. **Coachability** — % of failed / low-score learners contacted within 24h  
4. **Fairness confidence** — flagged attempts reviewed (not auto-punished)  
5. **Learning closure** — % of submitters who open results / review  

### 2.5 Demo narrative (5-minute business pitch)
1. **Pain (30s):** “After every cohort quiz, instructors open five tools and still don’t know who to chase.”  
2. **Launch (60s):** Create → questions → publish → paste emails → copy invite link.  
3. **Sit (60s):** Student continues attempt, sees countdown, submits with confirmation.  
4. **Close the loop (90s):** Student sees score + review; admin sees Results + Follow-up with one-click actions.  
5. **Edge (60s):** “This is the assessment workbench your program already needed — forms can’t coach, LMS is too heavy.”  

### 2.6 Brand promise (product language)
Replace institutional jargon with human product language:

| Avoid | Prefer |
|-------|--------|
| Begin Assessment | Start quiz / Continue quiz |
| Rules & Guidelines | Before you start |
| Submission Successful | Here’s how you did |
| Flagged for cheating | Needs review |
| SENT / DUPLICATE | Invite sent / Already invited |

---

## 3. Product principles (non-negotiable)

1. **Close every loop** — invite → enroll; answer → results; follow-up → action.  
2. **One job per screen** — no link-soup list rows as the primary UX.  
3. **Fairness without accusation** — integrity is for review, never punishment language.  
4. **Server is source of truth** — timer, auto-submit, score, access windows.  
5. **Teach after test** — results are part of the product, not an afterthought.  
6. **Admin is a workbench, not a CRUD table** — insights and next actions co-located.  
7. **Useful ≠ cluttered** — every chrome element must be real or removed.  

---

## 4. Current-state gap map (what this plan fixes)

### Student
| Gap | Impact |
|-----|--------|
| Submit ignores returned score | No payoff; feels broken |
| No results / review route | Learning loop incomplete |
| No countdown timer | Anxiety + unfair surprises |
| Gateway always “Begin” | Resume path unclear |
| Invite is a spinner tunnel | No welcome moment |
| OPEN_ENDED / TF storage fragile | Broken question types |
| Integrity FE unwired | Fairness features fake |
| Fake header chrome | Demo trust killer |

### Admin
| Gap | Impact |
|-----|--------|
| Modal create → disconnect to questions | Fragmented authoring |
| No analytics / results UI | Blind after invite |
| No attempt review page | Cannot coach or verify |
| Invite links not copyable / email simulated | Students never arrive |
| Instructions & integrity threshold not editable | Incomplete authoring |
| Follow-up next steps inert | Report dump, not workbench |
| Invitation vs Enrollment metric mismatch | Confusing funnel numbers |
| Unpublish / archive contracts incomplete | Trust & ops risk |

### Platform
| Gap | Impact |
|-----|--------|
| Named “QnA” but behaves like exam ops only | Expectation mismatch |
| RAG docs/search unused by quiz flows | Wasted differentiator |
| Auth verify UX weak | Onboarding friction |

---

## 5. Target experience (end state)

### 5.1 Learner journey
```
Invite email / link
  → Welcome (“You’re invited to {Quiz}”)
  → Register / Login / Verify (guided)
  → Dashboard (clear states + View results)
  → Gateway (human instructions, Continue vs Start)
  → Attempt (countdown, autosave, confirm submit)
  → Results (score, pass/fail, review policy)
  → Optional: practice / explanations
```

### 5.2 Instructor journey
```
Quiz Workspace
  Overview → Questions → Access → Live & Results → Follow-up
Create wizard
  Settings → Author → Validate (green) → Publish → Invite
Morning
  Follow-up actions (remind, open attempt, mailto)
Weekly
  Export cohort outcomes for stakeholders
```

### 5.3 Information architecture (routes)

**Student**
| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/invite/:token` | Welcome + accept |
| `/verify` | Email verification UX |
| `/quizzes/:quizId` | Gateway |
| `/quizzes/:quizId/attempt` | Live attempt |
| `/quizzes/:quizId/results` | Results & review |

**Admin**
| Route | Purpose |
|-------|---------|
| `/admin` | Redirect to quizzes or overview |
| `/admin/quizzes` | Portfolio list |
| `/admin/quizzes/:quizId` | **Quiz workspace** (tabs) |
| `/admin/quizzes/:quizId/questions` | Nested or tab: Questions |
| `/admin/follow-up` | Cross-quiz morning list |
| `/admin/attempts/:attemptId` | Attempt review (integrity + answers) |
| `/admin/reports` *(Phase 3)* | Exports & stakeholder summaries |

---

## 6. Execution plan by phase

Each phase is shippable. Do not start the next phase’s UI until the previous phase’s loops are closed.

---

### Phase 0 — Foundations & contracts (3–5 days)

**Objective:** Align definitions so later UI doesn’t lie.

#### Deliverables
1. **Funnel dictionary (one page)**  
   Define and lock: Invited, Accepted/Enrolled, Started, In progress, Submitted, Auto-submitted, Failed (below pass), Low score, Flagged for review.  
   Same labels in tracker, analytics, follow-up, student dashboard.
2. **Results policy contract**  
   When students see score / correct answers / explanations:  
   - `IMMEDIATE` | `AFTER_CLOSE` | `ADMIN_ONLY` (quiz setting).
3. **Answer storage contract**  
   - MCQ / TF: `selectedOptionId` (real option UUIDs only)  
   - OPEN_ENDED: `textAnswer` (new field) — never stuff text into option id  
4. **Access contract**  
   - Pending invitation + matching email on register/verify → auto-enroll  
   - Admin can always copy `/invite/{invitationId}`  
5. **Copy system**  
   Shared tone guide (learner-facing vs admin-facing) in `docs/product-copy.md` (create with Phase 1).

#### Exit criteria
- Written contracts reviewed by team  
- Schema change list approved for Phase 1  

---

### Phase 1 — Close the loops (make it feel alive)  
**Duration:** ~1.5–2 weeks  
**Business value:** Demo no longer dies after submit; invites actually work.

#### 1A. Student results & attempt polish

| ID | Work item | FE | BE | Notes |
|----|-----------|----|----|-------|
| S1 | Results page using submit `score` + passScore | ✅ | maybe | Route `/quizzes/:quizId/results` |
| S2 | Dashboard / cards: “View results” for submitted | ✅ | — | Replace mute blocked strip |
| S3 | Gateway CTA: Start vs Continue | ✅ | — | Based on `studentState` |
| S4 | Server countdown UI | ✅ | ✅ | Remaining seconds from server; never trust only client clock |
| S5 | Submit confirmation (unanswered count) | ✅ | — | Modal, not `window.confirm` |
| S6 | Wire integrity `visibilitychange` → API | ✅ | exists | Quiet; no student accusation UI |
| S7 | Invite welcome screen (quiz title, CTA) | ✅ | maybe | End spinner tunnel |
| S8 | Remove fake chrome (search/bell/Connected) or make real | ✅ | — | Prefer remove for trust |
| S9 | Humanize blockedReason dates | ✅ | ✅ | Format on FE; avoid raw ISO in strings |

#### 1B. Access that works

| ID | Work item | FE | BE |
|----|-----------|----|----|
| A1 | Copy invite link in tracker + bulk invite success | ✅ | — |
| A2 | Embed invite URL in email template (even simulated log) | — | ✅ |
| A3 | Auto-enroll on register/verify when email matches pending invites | — | ✅ |
| A4 | Gate bulk invite to PUBLISHED (or warn hard) | ✅ | ✅ |
| A5 | Verify email student page `/verify` | ✅ | exists |

#### 1C. Admin authoring essentials

| ID | Work item | FE | BE |
|----|-----------|----|----|
| Q1 | Edit `instructions` on quiz create/settings | ✅ | ✅ DTO |
| Q2 | Edit `integrityThreshold` | ✅ | ✅ |
| Q3 | Post-create CTA: “Add questions” → navigate | ✅ | — |
| Q4 | Publish disabled until `validationErrors` empty | ✅ | exists |
| Q5 | Enforce unpublish rules per publish-contract | — | ✅ |
| Q6 | Fix TF options always real UUIDs; OPEN_ENDED `textAnswer` | ✅ | ✅ schema |

#### Phase 1 UX extras (high leverage)
- Soft toast system (success/error) instead of only banners  
- Consistent empty states with one next action  
- Student name in header from `/auth/me`  
- Pass/fail chip using `passScore` (Passed / Not yet)

#### Phase 1 exit criteria
- [ ] Student sees score + pass/fail after submit  
- [ ] Admin can copy invite link and student can enroll without “perfect SMTP”  
- [ ] Countdown visible; auto-submit explained on gateway  
- [ ] Integrity events appear for real tab switches  
- [ ] Instructions editable  

**Demo line after Phase 1:**  
> “Invite → sit with a real clock → see how you did.”

---

### Phase 2 — Admin workbench (make instructors useful)  
**Duration:** ~2 weeks  
**Business value:** Platform becomes a **B2B tool**, not a student app with an admin CRUD page.

#### 2A. Quiz workspace IA

Replace list-row link soup with a dedicated workspace:

**`/admin/quizzes/:quizId`** tabs:
1. **Overview** — status, window, validation, quick stats  
2. **Questions** — existing bank (move/embed current page)  
3. **Access** — bulk invite, tracker, copy links, resend  
4. **Results** — analytics cards + learner table  
5. **Settings** — title, description, instructions, duration, window, pass, integrity, results policy  

List page becomes a **portfolio**: search, status, completion mini-stat, primary CTA “Open”.

#### 2B. Results & analytics UI (APIs exist)

| ID | Work item |
|----|-----------|
| R1 | Wire `GET /analytics/quiz/:quizId` into Results tab cards |
| R2 | Wire question analytics (hardest questions) |
| R3 | Learner results table: name, email, state, score, submittedAt |
| R4 | Attempt review route `/admin/attempts/:attemptId` |
| R5 | Integrity review list inside Results or Attempt page (“Needs review”) |
| R6 | Align invitedCount with Invitation funnel (document + fix) |

#### 2C. Actionable follow-up

| ID | Work item |
|----|-----------|
| F1 | Each follow-up row: primary action button |
| F2 | Actions: Copy reminder text / mailto / Open attempt / Resend invite |
| F3 | Deep links from follow-up → attempt review / access tracker |
| F4 | Include invited-not-accepted in the right group (align with funnel dictionary) |
| F5 | Optional: “Mark as contacted” local/admin note *(nice-to-have)* |

#### 2D. Create wizard

| Step | Screen |
|------|--------|
| 1 | Basics (title, description, window, duration, pass, instructions) |
| 2 | Add at least one valid question (or skip with warning) |
| 3 | Review validation → Publish |
| 4 | Invite cohort |

#### Phase 2 UX extras
- Custom confirm modals (delete, unpublish, leave dirty form)  
- Timezone label on all datetime displays (Sprint 1 AC)  
- Quiz status timeline on Overview (Draft → Published → Closed)  
- Keyboard-friendly question form  
- Admin shell nav: Quizzes · Follow-up · (Reports later)

#### Phase 2 exit criteria
- [ ] Admin can answer “who failed and why?” without leaving the product  
- [ ] Follow-up buttons do something  
- [ ] Attempt review shows answers + integrity event count  
- [ ] Create → publish → invite is a guided path  

**Demo line after Phase 2:**  
> “One morning workbench: who to chase, what to review, what the cohort scored.”

---

### Phase 3 — Natural QnA & teaching layer  
**Duration:** ~2–3 weeks  
**Business value:** Earn the name **QnA**; results teach; optional knowledge edge.

#### 3A. Review that teaches

| ID | Work item |
|----|-----------|
| T1 | Per-question explanation field (admin authoring) |
| T2 | Student review UI respects results policy |
| T3 | “What to revisit” summary for failed / low score |
| T4 | Optional practice mode quiz flag (`isPractice`) — unlimited or multi-attempt *(product choice)* |

#### 3B. Richer question types (controlled)

| ID | Work item |
|----|-----------|
| T5 | OPEN_ENDED: store text; mark `PENDING_REVIEW` or keyword rubric v1 |
| T6 | Admin grading queue for open answers *(if enabled)* |
| T7 | Keep MCQ/TF as default path; don’t force open-ended for MVP demos |

#### 3C. Knowledge edge (use existing RAG carefully)

Do **not** build a chatbot for the sake of it. Use docs where they create business edge:

| ID | Work item | Value |
|----|-----------|-------|
| K1 | Admin: ingest program FAQ/docs into existing Document/Chunk pipeline | Asset reuse |
| K2 | “Suggest questions from document” (draft MCQs for admin edit) | Faster authoring |
| K3 | Optional post-results “Related reading” from search hits | Learning closure |
| K4 | Explicitly separate **Graded exam** vs **Practice with hints** | Trust & fairness |

#### 3D. Stakeholder / business surfaces

| ID | Work item |
|----|-----------|
| B1 | CSV export of filtered results (Sprint 4 requirement) |
| B2 | Simple cohort summary card (completion, avg score, pass rate) for screenshots |
| B3 | Individual learner summary (all attempts) |
| B4 | Public/demo landing one-pager in-app or docs for pitch *(optional)* |

#### Phase 3 exit criteria
- [ ] Student review feels like learning, not a score dump  
- [ ] Admin can export outcomes for a sponsor meeting  
- [ ] At least one knowledge-assisted authoring or reading path works end-to-end  
- [ ] Product language consistently “QnA / assessment workbench”  

**Demo line after Phase 3:**  
> “Assess → teach → prove outcomes — with optional knowledge-grounded authoring.”

---

### Phase 4 — Hardening, polish, demo readiness  
**Duration:** ~1–1.5 weeks  

| ID | Work item |
|----|-----------|
| H1 | Auth hardening: password reset, identical error messages, server wrong-role refusal message |
| H2 | Archive quiz workflow (or remove ARCHIVED filter until real) |
| H3 | Email: real provider path + failure → resend from tracker |
| H4 | Seed data for every funnel state + flagged attempt + closed-with-results |
| H5 | Known-issues log + demo script + API collection |
| H6 | Performance pass on admin results tables  
| H7 | Accessibility: focus states, contrast, confirm dialogs, timer announcements |
| H8 | Mobile attempt UX: always-visible submit + timer |
| H9 | Remove dead stubs (`QuizAttemptPlaceholder`, unused DTOs) |
| H10 | Unify analytics endpoints (pick one admin analytics surface) |

#### Exit criteria
- [ ] Mentor can run demo cold from script  
- [ ] No fake UI affordances  
- [ ] Seed covers all story beats  

---

## 7. Detailed epic backlog (by workstream)

### Workstream W1 — Learner experience
1. Results page + routing after submit  
2. Countdown + auto-submit messaging  
3. Submit confirmation  
4. Continue vs Start  
5. Invite welcome + verify UX  
6. Review / explanations (Phase 3)  
7. Header identity & empty states  

### Workstream W2 — Instructor workbench
1. Quiz workspace shell + tabs  
2. Create wizard  
3. Results tab + learner table  
4. Attempt review  
5. Actionable follow-up  
6. Export / reports (Phase 3–4)  

### Workstream W3 — Access & messaging
1. Invite URL in email + copy link  
2. Auto-enroll on verify/register  
3. Publish-gated invites  
4. Resend failed emails  
5. Reminder action from follow-up  

### Workstream W4 — Fairness & integrity
1. FE visibility capture  
2. Threshold setting UI  
3. Admin review wording + attempt link  
4. Follow-up consumes live flags  

### Workstream W5 — Data model & contracts
1. Funnel dictionary implementation  
2. `textAnswer` + results policy fields  
3. Explanation field on questions  
4. Unpublish / archive rules  
5. Snapshot/review payload for student results (never leak early)  

### Workstream W6 — Knowledge & differentiation
1. Doc ingest UX for admins  
2. Suggest questions from docs  
3. Related reading on results  
4. Practice vs graded mode  

### Workstream W7 — Platform quality
1. Toasts, modals, timezone labels  
2. Auth hardening  
3. Seed + demo script  
4. Dead code removal  
5. Accessibility & mobile  

---

## 8. Schema / API changes checklist

### Likely Prisma additions
```text
Quiz.resultsPolicy          enum IMMEDIATE | AFTER_CLOSE | ADMIN_ONLY
Quiz.isPractice             Boolean? (optional Phase 3)
Question.explanation        String?
Answer.textAnswer           String?  @db.Text
Answer.selectedOptionId     keep for MCQ/TF
# Optional later:
AdminNote / ContactedAt on follow-up (or separate ContactLog)
```

### API additions / changes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/student/quizzes/:quizId/results` | Score + review payload per policy |
| GET | `/attempts/:id/remaining-time` or embed in attempt GET | Countdown source of truth |
| PATCH | quiz DTOs | instructions, integrityThreshold, resultsPolicy |
| POST | auth verify/register | enroll matching invitations |
| GET | `/admin/attempts/:id` | Full review DTO |
| POST | `/admin/invitations/:id/resend` | Resend email |
| GET | export endpoint | CSV (Phase 3/4) |

### Frontend API modules
- Extend `studentQuizzesApi` with results + remaining time  
- New `adminResultsApi` / workspace endpoints  
- Wire existing analytics + integrity review into FE  

---

## 9. UX improvement catalog (beyond the audit)

These are intentional upgrades so the product feels like a **platform**, not a school homework app.

### Platform-wide
1. **Unified design system** — one type scale, one shell language for login/admin/student  
2. **Real identity** — name, role badge, logout; no placeholder “ST”  
3. **Honest status** — only show connection/search if functional  
4. **Guided empty states** — every empty view has one CTA  
5. **Toast + inline errors** — name the problem and the next step  
6. **Timezone always named** — e.g. “Closes 12 Aug, 18:00 (Africa/Cairo)”  

### Learner-specific
7. **Pre-start checklist** — duration, attempts allowed (1), results policy, integrity note in plain language  
8. **Progress that matches mental model** — one progress metaphor (answered / total)  
9. **Offline/save reassurance** — “Saved · 2s ago” near the question  
10. **Post-submit emotional clarity** — Passed / Not yet + encouraging next step without being childish  

### Instructor-specific
11. **Portfolio health** — each quiz card shows invited / submitted / avg score  
12. **Validation as coach** — “3 issues before publish” with jump links to questions  
13. **Cohort health strip** on Overview — completion sparkline or simple rates  
14. **One-click share** — copy invite, copy results summary blurb for Slack/email  
15. **Review queue** — open-ended + integrity flags in one “Needs attention” list  

### Business / stakeholder edge
16. **Outcome snapshot** — printable/exportable “Cohort report” (completion, pass rate, hard questions)  
17. **Audit-friendly language** — fairness, snapshot grading, review-not-punish story ready for mentors  

---

## 10. Suggested team sequencing (if parallelizing)

| Stream | Owner focus | Phase |
|--------|-------------|-------|
| Learner results + timer + submit UX | Frontend + attempt BE | 1 |
| Invite link + auto-enroll + email body | Invitations BE + FE | 1 |
| Quiz settings (instructions, threshold, policy) | Admin quizzes | 1 |
| Quiz workspace shell + Results tab | Admin FE + analytics | 2 |
| Attempt review + integrity FE capture | Integrity + FE | 1–2 |
| Follow-up actions | Follow-up FE + small BE | 2 |
| Explanations + review policy | Questions + student results | 3 |
| RAG suggest / related reading | Documents + search | 3 |
| Export + hardening + demo seed | Mixed | 4 |

Dependency rule: **W3 Access before big demos**; **W1 Results before claiming QnA**; **W2 Workbench before claiming B2B**.

---

## 11. Success metrics & acceptance

### Product KPIs (after Phase 2)
| Metric | Target |
|--------|--------|
| Invite → enroll conversion (with copy-link path) | ≥ 90% in demo seed path |
| Submitters who reach results screen | 100% of successful submits |
| Admin time to “who failed?” answer | &lt; 30 seconds from quiz open |
| Follow-up rows with working primary action | 100% of groups |

### Quality gates per phase
- No student API leaks `isCorrect` before policy allows  
- No fake interactive chrome  
- Publish cannot succeed with invalid questions  
- Timer remaining matches server within ~2s on focus return  
- Integrity events do not block answering if POST fails  

### Demo acceptance script (Phase 2+)
1. Admin creates quiz with instructions → adds 3 questions → publish enabled only when valid  
2. Invites 3 emails → copies link → student enrolls  
3. Student starts, switches tab (event logged), continues, submits with 1 blank confirmed  
4. Student sees Passed/Not yet + score  
5. Admin Results shows cohort cards; opens attempt; sees integrity count as “Needs review”  
6. Follow-up shows low-score learner with Open attempt / Mailto  

---

## 12. Risks & decisions to lock early

| Risk / decision | Recommendation |
|-----------------|----------------|
| Multi-attempt vs single attempt | Keep **one graded attempt** for fairness; add Practice mode later |
| When to show correct answers | Default `AFTER_CLOSE` for exams; `IMMEDIATE` for practice |
| Open-ended grading | Phase 3 only; don’t block Phase 1–2 |
| Email provider | Phase 1 must work via **copy link** even if SMTP is fake |
| Chat-style QnA UI | Do **not** rebuild attempt as chat in Phase 1; earn “QnA” via review + explanations first |
| RAG chatbot during graded attempt | **Forbidden** (fairness). Hints only in practice mode |

---

## 13. Documentation deliverables (doc-first)

| Doc | When |
|-----|------|
| This execution plan | Done |
| `docs/product/funnel-dictionary.md` | Phase 0 |
| `docs/product/results-policy.md` | Phase 0 |
| `docs/product/product-copy.md` | Phase 1 start |
| `docs/product/quiz-workspace-ia.md` | Phase 2 start |
| `docs/demo/demo-script.md` | Phase 4 (draft earlier) |
| Update `docs/00_Project_Log.md` | Each phase exit |

---

## 14. What “done” looks like (platform vision)

A stakeholder can say:

> “We launched a cohort assessment in minutes, learners got fair timed attempts and clear results, and our instructors started the next morning with a single list of who to help — plus a report we can show the program sponsor.”

That is the business edge: **not another student quiz app** — an **assessment & outcomes workbench** for training programs.

---

## 15. Immediate next actions (start this week)

1. **Approve this plan** (phases, business story, results policy default).  
2. **Phase 0 contracts** — funnel dictionary + results policy + answer storage.  
3. **Start Phase 1 in parallel tracks:**  
   - Track A: Student results page + submit confirm + Continue CTA  
   - Track B: Invite copy-link + email URL + auto-enroll  
   - Track C: Instructions field + publish-disabled-until-valid  
4. **Schedule a 15-minute demo dry-run** at end of Phase 1 using the business narrative in §2.5.

---

## Appendix A — Phase cheat sheet

| Phase | Theme | One-sentence outcome |
|-------|-------|----------------------|
| 0 | Contracts | Team shares one language for funnel & results |
| 1 | Close loops | Sit → score; invite → enroll; clock is real |
| 2 | Workbench | Admin runs the cohort from one quiz workspace |
| 3 | Teach & prove | Review teaches; exports prove outcomes; knowledge assists authoring |
| 4 | Harden | Demo-ready, honest UI, seeded stories |

## Appendix B — Out of scope (for now)

- Full LMS (courses, video, assignments)  
- Live remote proctoring / webcam  
- Multi-tenant billing engine (tell the story; implement later)  
- Social / community features  
- Rebuilding attempt UI as a free-form chatbot for graded exams  

## Appendix C — Traceability to prior audit

This plan absorbs and extends the prior flow audit:

- Student: results, timer, confirm, continue, invite welcome, integrity wiring, answer-type fixes  
- Admin: workspace IA, analytics UI, attempt review, actionable follow-up, instructions, invite links  
- Platform: funnel consistency, RAG as differentiator (not orphan), business presentation edge, UX convention upgrades  

---

*End of execution plan.*
