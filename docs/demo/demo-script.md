# Demo script — QnA assessment workbench

**Goal:** 5-minute story: Launch → Sit → Result → Coach → Prove

## Setup
- Backend running with migrated DB
- Frontend running
- Admin: `admin@example.com` / `Admin123!`
- Student account verified (or use `/verify`)

## Script

1. **Pain (30s)**  
   “After every cohort quiz, instructors open five tools and still don’t know who to chase.”

2. **Launch (60s)**  
   - Admin → New quiz → fill instructions + results policy → Create & add questions  
   - Add 2–3 MCQ/TF with explanations  
   - Publish (button disabled until valid)  
   - Invite emails → Copy invite link (works even when email is simulated)

3. **Sit (60s)**  
   - Open invite as student → Continue to quiz  
   - Start / Continue → countdown visible  
   - Answer, switch tab once (integrity quiet)  
   - Submit with unanswered confirmation

4. **Close the loop (90s)**  
   - Student results: score + Passed/Not yet + review/explanations  
   - Admin Open quiz → Results: analytics, hardest questions, Open attempt  
   - Follow-up: Email learner / Open attempt / Copy next step  
   - Export CSV from Results

5. **Edge (60s)**  
   “Forms start the job. LMS overcomplicates it. QnA finishes it — invite, sit, teach, chase, prove.”

## Known honest limits
See also `docs/demo/known-issues.md`.

- Email may be simulated; copy invite link is the reliable path
- Integrity is for **Needs review**, never accusation
- Graded exams do not show AI hints during the attempt
- Seed includes **Closed Quiz — Results Ready** for review + explanations after close
