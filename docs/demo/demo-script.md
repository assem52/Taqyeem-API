# Demo script — QnA assessment workbench

**Goal:** 5-minute story: Launch → Sit → Result → Coach → Prove  
**Story / packaging:** `docs/product/packaging.md` · pitch page `/welcome`

## Setup
- Backend running with migrated DB
- Frontend running
- Open `/welcome` once for the category story (optional cold open)
- Admin: `admin@example.com` / `Admin123!`
- Student account verified (or use `/verify`)

## Script

1. **Pain (30s)**  
   “After every cohort quiz, instructors open five tools and still don’t know who to chase.”

2. **Launch (60s)**  
   - Admin → **Launch a cohort quiz** (guided wizard)  
   - Basics → add questions → publish → invite  
   - Copy invite link (works even when email is simulated)

3. **Sit (60s)**  
   - Open invite as student → Continue to quiz  
   - Start / Continue → countdown visible  
   - Answer, switch tab once (integrity quiet)  
   - Submit with unanswered confirmation

4. **Close the loop (90s)**  
   - Student results: score + Passed/Not yet + review/explanations  
   - Admin Open workspace → Results: **Outcomes snapshot** (sponsor screenshot) + CSV  
   - Morning follow-up: Email learner / Open attempt / Copy next step  

5. **Edge (60s)**  
   “Forms start the job. LMS overcomplicates it. QnA finishes it — invite, sit, teach, chase, prove.”

## Known honest limits
See also `docs/demo/known-issues.md`.

- Email may be simulated; copy invite link is the reliable path
- Integrity is for **Needs review**, never accusation
- Graded exams do not show AI hints during the attempt
- Seed includes **Closed Quiz — Results Ready** for review + explanations after close
- Core vs Growth packaging is presentational (no billing gate yet)
