# QnA — Business & Product Plan for the Next Stage

**Audience:** Product managers, founders, mentors, business stakeholders  
**Lens:** Business value and product strategy — not engineering implementation  
**Date:** 2026-08-09  
**Companion:** Technical delivery detail lives in `QnA-Platform-Execution-Plan.md`. This document answers *what we must become* and *why*.

---

## 1. The honest diagnosis

### What we built
A **functional assessment tool**: create quizzes, invite learners, take attempts, store scores, list people to follow up.

### What we did not build
A **business product**.

We shipped capabilities as coding tasks (auth, publish, invite, attempt, follow-up) without anchoring them to:

- Who pays  
- What painful job we replace  
- What outcome the buyer can show their boss  
- Why someone would switch from Forms / an LMS / email + spreadsheets  

**Result:** The platform works, but it does not yet *sell*. It feels like an intern project that completed tickets — not a product a training program would depend on next cohort.

### The core problem in one line
> We have **workflow fragments**. A business product needs **closed value loops** that create an outcome someone will pay for.

---

## 2. What “business edge” means here

A feature has business edge when it does at least one of these:

1. **Saves operator time** they currently burn every cohort  
2. **Reduces risk** (unfair grading, lost invites, unclear who failed)  
3. **Creates proof** the program can show sponsors / HR / mentors  
4. **Makes switching costly** once they run a second cohort on us  
5. **Is easy to demo in under 5 minutes** as a clear before/after  

If a feature only “completes the sprint,” it is not edge.  
If a feature makes an academy say *“we can’t go back to Forms,”* it is edge.

---

## 3. Who we are for (and who we are not)

### Primary customer (buyer)
**Training programs that run cohorts** — bootcamps, academies, corporate L&D, internship programs.

Their recurring pain:
- Launching assessments is messy  
- Completion is unknown until someone digs  
- Results don’t teach  
- Follow-up is manual and inconsistent  
- Reporting to stakeholders is a scramble  

### Primary users
| User | Job |
|------|-----|
| **Program operator / instructor** | Launch, monitor, coach, report |
| **Learner** | Sit a fair assessment and understand the outcome |

### Not our customer (yet)
- Universities needing a full LMS  
- Companies wanting enterprise proctoring / webcam surveillance  
- Consumers wanting a public quiz social app  
- Teams wanting a general chatbot  

**Positioning we own:**
> The assessment & outcomes layer for cohort-based training — faster than an LMS, smarter than Forms, built for operators who must chase and prove learning.

**One-liner for pitches:**
> Invite a cohort. Run a fair quiz. See who needs help. Prove the outcome.

---

## 4. Current product vs business product

| Dimension | Today (functional tool) | Next stage (business product) |
|-----------|-------------------------|--------------------------------|
| Story | “We built quizzes + invites” | “We run cohort assessment end-to-end” |
| After submit | Dead end | Learner understands result; operator sees impact |
| Admin home | Tables and buttons | Workbench: launch → monitor → act → report |
| Invite | Technical step | Reliable cohort onboarding |
| Follow-up | Passive list | Daily action system |
| Success metric | Feature exists | Completion ↑, chase time ↓, report ready in minutes |
| Demo feeling | “Look what we coded” | “Look what you can stop doing manually” |

---

## 5. The value loops we must complete

Business products are remembered as loops, not screens.

### Loop A — Launch
**From:** “I need this cohort assessed”  
**To:** “Every learner has a clear way in”  
**Edge:** Faster and more reliable than emailing a Form link into chaos.

### Loop B — Sit
**From:** “Learner starts”  
**To:** “Fair attempt finished (time + integrity + one attempt clarity)”  
**Edge:** Trust that the result means something.

### Loop C — Learn
**From:** “Score exists somewhere”  
**To:** “Learner knows how they did and what to fix”  
**Edge:** Assessment becomes development, not punishment. This is where “QnA” becomes real.

### Loop D — Coach
**From:** “Someone didn’t finish / failed / looks suspicious”  
**To:** “Operator took a next step today”  
**Edge:** Replaces morning spreadsheet hunting.

### Loop E — Prove
**From:** “Sponsor asks how the cohort did”  
**To:** “One clear outcomes snapshot / export”  
**Edge:** This is what buyers actually buy political cover for.

**Rule for the next stage:**  
No major work unless it strengthens at least one of these five loops.  
Anything outside them is polish or distraction.

---

## 6. Fundamental required features (must-have for business readiness)

These are **product capabilities**, not tickets. If any are missing, we still look like a student project.

### 6.1 Must-haves for the buyer (operator)

| # | Capability | Why it’s fundamental | Business outcome |
|---|------------|----------------------|------------------|
| 1 | **Guided quiz launch** | Creating + publishing + inviting must feel like one job | Time-to-launch becomes a selling point |
| 2 | **Reliable cohort access** | Invites must actually get learners in (clear link, clear status) | Trust; no “did they get it?” panic |
| 3 | **Live cohort visibility** | Invited / started / submitted / scores at a glance | Operator control; demo wow |
| 4 | **Results workbench** | Who passed, failed, didn’t start — in one place | Replaces spreadsheet ops |
| 5 | **Actionable follow-up** | Each at-risk learner has a next action, not just a label | Daily habit → retention |
| 6 | **Integrity as review, not accusation** | Soft signals + human review language | Differentiator vs Forms; safe for mentors |
| 7 | **Outcomes report / export** | Shareable cohort summary for stakeholders | **This is the monetization moment** |
| 8 | **Fair attempt rules learners understand** | Time window, duration, one attempt, what happens on close | Fewer support tickets; perceived professionalism |

### 6.2 Must-haves for the learner (or the product feels unfinished)

| # | Capability | Why it’s fundamental | Business outcome |
|---|------------|----------------------|------------------|
| 9 | **Clear start / continue experience** | Learners shouldn’t feel lost in system states | Completion rate |
| 10 | **Visible time remaining** | Without this, timed exams feel unfair | Trust + fewer disputes |
| 11 | **Confirmation before final submit** | Prevents accidental empty submits | Result quality |
| 12 | **Results that close the loop** | Score, pass/fail, path to review | Brand promise of QnA; word-of-mouth |
| 13 | **Human language throughout** | No robotic institutional copy | Perceived product maturity |

### 6.3 Must-haves for commercial storytelling

| # | Capability | Why it’s fundamental |
|---|------------|----------------------|
| 14 | **A crisp category story** | “Assessment & outcomes workbench for cohorts” |
| 15 | **A 5-minute demo narrative** | Launch → sit → result → coach → prove |
| 16 | **Clear packaging** | What is Core vs Growth (follow-up depth, reports, integrity, knowledge assist) |
| 17 | **Named competitor contrast** | Forms = easy but blind; LMS = powerful but heavy; QnA = last-mile outcomes |

**If we only ship engineering leftovers, skip commercial storytelling — we will still lack edge.**

---

## 7. What is *not* fundamental (yet)

Do not let these steal the next stage:

- Full LMS (courses, videos, assignments)  
- Chatbot-during-exam “AI tutor” (hurts fairness and trust)  
- Webcam proctoring  
- Complex billing engine before value is obvious  
- Social feeds, gamification badges for their own sake  
- Open-ended AI grading as a day-one dependency  

These can become **upsells later**. They are not the foundation of business edge now.

---

## 8. Product refactor required (business view)

“Refactor” here means **reshape the product around value**, not rewrite code for its own sake.

### 8.1 Refactor the product identity
**From:** Quiz CRUD app with a student mode  
**To:** Cohort assessment & outcomes platform  

Everything in the UI should answer: *launch, sit, learn, coach, prove*.

### 8.2 Refactor the admin experience
**From:** List of quizzes with many disconnected actions  
**To:** A **Quiz Workspace** as the center of gravity  

Operators should open one quiz and manage:
- Setup  
- Access / invites  
- Live progress  
- Results  
- People who need attention  

**Business reason:** Buyers pay for *control of a cohort*, not for “a settings modal.”

### 8.3 Refactor the learner experience
**From:** Form + generic success message  
**To:** A complete assessment session with a meaningful ending  

**Business reason:** Learners are the delivery channel of product quality. If they feel the product is robotic, operators lose confidence.

### 8.4 Refactor success metrics inside the product
**From:** “Did the button work?”  
**To:** Visible health of the cohort — completion, pass rate, people to chase  

**Business reason:** What we show on screen trains the customer what to value — and what to renew for.

### 8.5 Refactor language and tone
**From:** System/status language (`Begin Assessment`, raw statuses, mute blocks)  
**To:** Operator and learner language (“Continue quiz”, “Invite sent”, “Needs review”, “Here’s how you did”)  

**Business reason:** Language is positioning. Robotic copy signals “internal tool.” Human copy signals “product.”

### 8.6 Refactor the roadmap filter
**From:** Build whatever the old sprint list still owes  
**To:** Only fund work that strengthens Launch / Sit / Learn / Coach / Prove  

**Business reason:** Focus creates edge. Scattered completeness does not.

---

## 9. Next-stage plan (product stages, not tech sprints)

### Stage 0 — Decide the business story (short, mandatory)
**Outcome:** Everyone pitches the same product.

Lock:
- Customer & buyer  
- Category line  
- Five value loops  
- Default packaging story (Core vs Growth)  
- Demo script outline  

**Exit:** A mentor or outsider can repeat what QnA is for in one sentence.

---

### Stage 1 — Make the core loops real (business MVP+)
**Theme:** Stop looking unfinished. Become demo-credible.

**Product goals:**
1. Learners get a real ending (results + pass/fail clarity)  
2. Operators can get learners in reliably (invite access that works in practice)  
3. Timed attempt feels professional (time remaining + clear rules)  
4. Copy and empty states feel intentional  

**Business test:**  
Can we run a live mini-cohort demo where nobody asks “but where do they see the score?” or “how do they actually open the quiz?”

---

### Stage 2 — Become the operator’s daily tool
**Theme:** This is what they open in the morning.

**Product goals:**
1. One workspace per quiz for monitoring and results  
2. Follow-up becomes actions, not a report dump  
3. Integrity review is available and carefully worded  
4. Cohort health is obvious without exporting to Excel first  

**Business test:**  
Would an instructor prefer this to their current spreadsheet + inbox routine for one full cohort cycle?

---

### Stage 3 — Become the thing they show stakeholders
**Theme:** Proof and teaching — the commercial wedge.

**Product goals:**
1. Results that teach (review / explanations — earn the QnA name)  
2. Exportable / presentable cohort outcomes  
3. Clear packaging: Core assessment vs Growth insights/reporting  
4. Optional knowledge-assisted authoring as a differentiator (docs → better questions), without turning graded exams into chatbots  

**Business test:**  
Can a program lead use our output in a sponsor/HR update without rebuilding charts by hand?

---

### Stage 4 — Package and harden for trust
**Theme:** Ready to be taken seriously beyond a classroom demo.

**Product goals:**
1. Polished onboarding and recovery (account access, verification clarity)  
2. Consistent quality bars across roles  
3. Seeded stories for every sales/demo beat  
4. Known limitations stated honestly (builds trust)  

**Business test:**  
Can a stranger run the demo script cold and still feel the edge?

---

## 10. Packaging (how we present commercial value)

Keep packaging simple enough to say out loud.

### Core — “Run the assessment”
- Create & publish quizzes  
- Invite cohort & track access  
- Fair timed attempt  
- Scores & basic results for learners  
- Basic cohort status  

### Growth — “Operate and prove”
- Results workbench  
- Actionable follow-up  
- Integrity review  
- Outcomes export / stakeholder summary  
- Hard-question insights  

### Later add-on — “Knowledge edge”
- Program docs feeding better question drafting / post-result reading  
- Practice mode separate from graded exams  

**Presentation rule:**  
Sell Core as relief from Forms.  
Sell Growth as relief from spreadsheets + awkward LMS reporting.  
Sell Knowledge as acceleration, not as the identity of the product.

---

## 11. Competitive contrast (use in every pitch)

| Need | Google Forms | LMS quiz | QnA target |
|------|--------------|----------|------------|
| Launch fast | Strong | Weak | Strong |
| Fair timed cohort attempt | Weak | Medium | Strong |
| See who to chase tomorrow morning | Weak | Weak | **Strong** |
| Learner leaves smarter | Weak | Medium | **Strong** |
| Stakeholder-ready proof | Weak | Medium | **Strong** |
| Light enough for academies | Strong | Weak | Strong |

**Winning claim:**
> Forms start the job. LMS overcomplicates the job. QnA finishes the job.

---

## 12. Success metrics (product/business, not engineering)

### Leading indicators (next stage)
- Time for an operator to go from idea → invited cohort  
- % of invited learners who successfully enter the quiz  
- % of submitters who reach a clear results ending  
- Time for an operator to identify “who needs help today”  

### Lagging indicators (when used with real cohorts)
- Completion rate per cohort  
- Operator time spent chasing (qualitative first, then measured)  
- Reuse: do they run a **second** cohort on the platform without being asked?  
- Stakeholder report prepared without leaving the product  

### Vanity metrics to ignore
- Number of screens built  
- Number of endpoints  
- “All sprint tasks closed” without loop completion  

---

## 13. Risks if we stay “feature complete but business-blind”

1. **Demo death** — impressive plumbing, no emotional payoff  
2. **Category confusion** — “Is this an LMS? A form? A chatbot?”  
3. **No willingness to pay** — nothing only we do well  
4. **Operator abandonment** — still need spreadsheets beside us  
5. **Learner distrust** — robotic flow makes the program look amateur  

---

## 14. Product principles for every decision going forward

1. **Close the loop or don’t ship.**  
2. **Design for the operator’s morning.**  
3. **Learners deserve an ending.**  
4. **Proof is a feature.**  
5. **Fairness language must be careful.**  
6. **Say no to LMS gravity.**  
7. **Differentiate with outcomes, not with more fields.**  

---

## 15. Immediate product priorities (ordered)

1. **Define and socialize the story** (Stage 0) — category, loops, packaging, demo arc  
2. **Learner results ending** — without this, no QnA business claim  
3. **Reliable invite → access** — without this, no cohort business claim  
4. **Operator visibility + actions** — without this, no paid workbench claim  
5. **Outcomes snapshot / export** — without this, weak willingness to pay  
6. **Teaching review layer** — converts us from exam tool to QnA platform  
7. **Only then** deepen knowledge/AI assist as an accelerator  

---

## 16. What “next stage success” looks like

We will know the platform has a business view when:

- A pitch starts with **customer pain**, not modules  
- A demo ends with **proof and follow-up**, not “submit succeeded”  
- An operator can run a cohort **without a side spreadsheet**  
- A learner leaves saying they **understood the result**  
- A stakeholder can be shown a **cohort outcome** in one place  
- The team rejects new ideas that don’t strengthen Launch / Sit / Learn / Coach / Prove  

---

## 17. Summary

We already proved we can build the machinery.

The next stage is not “more features.”  
It is **productization**:

- Choose a buyer  
- Complete the value loops  
- Refactor the experience around operator control and learner closure  
- Prioritize fundamental capabilities that create time savings, trust, and proof  
- Package and pitch the edge clearly  

**From:** a functional quiz codebase  
**To:** a cohort assessment & outcomes product people can defend buying  

---

*End of business & product plan.*
