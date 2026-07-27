# Student Classification for Admin Follow-Up (Week 3)

**Status:** Draft for team review  
**Owner:** Assem  
**Consumers:** Admin follow-up list API, Slot 3 reminders (Sprint 4)  
**Implementation:** `backend/src/modules/admin-follow-up/classify-learner-follow-up.ts`

---

## 1. Purpose

Classify each enrolled learner on a **published** quiz into exactly one follow-up reason (or exclude them). Output drives the admin morning follow-up list and the agreed **“did not start”** definition for Slot 3.

---

## 2. Candidate population

A learner appears in the follow-up pipeline only when:

| Rule | Condition |
|------|-----------|
| Enrolled | `Enrollment` row exists for `(studentId, quizId)` |
| Published | `Quiz.status === PUBLISHED` |
| Eligible invitation | Sprint 3 seed: enrollment = invited. Slot 3: filter by invitation status when available |

Draft quizzes are never included.

---

## 3. “Did not start” (Slot 3 sign-off required)

> A learner **did not start** when they are enrolled on a published quiz and **no `Attempt` row** exists for that `(studentId, quizId)` pair.

| Case | Classification |
|------|----------------|
| No attempt | `DID_NOT_START` |
| Quiz window closed, still no attempt | `DID_NOT_START` (not `Closed`) |
| `IN_PROGRESS` attempt | `STARTED_NOT_SUBMITTED` |
| Invitation sent, quiz never opened | `DID_NOT_START` |

**Score rule:** `score` must be `null` in API/UI — never `0`. A learner who never sat the quiz is not a zero scorer.

---

## 4. Follow-up reasons (mutually exclusive)

Apply rules in this **precedence order**; first match wins:

| Priority | Reason | Condition | Next step |
|----------|--------|-----------|-----------|
| 1 | `FLAGGED_FOR_REVIEW` | Active integrity flag | Review attempt details for administrative follow-up |
| 2 | `STARTED_NOT_SUBMITTED` | Attempt exists, `status === IN_PROGRESS` | Contact learner to complete submission |
| 3 | `DID_NOT_START` | No attempt row | Send invitation reminder |
| 4 | `FAILED` | `SUBMITTED` or `AUTO_SUBMITTED`, `passScore` set, `score < passScore` | Review result and discuss retake options |
| 5 | `LOW_SCORE` | Submitted, not failed, `score < 60` | Schedule coaching session |
| — | *(excluded)* | Passed and score ≥ 60 (when `passScore` null or met) | Not on follow-up list |

### Notes

- **Admin vs student dashboard:** Student `Closed` (deadline passed) does **not** change admin classification. `IN_PROGRESS` after close → still `STARTED_NOT_SUBMITTED`.
- **Failed vs low score:** Failed wins when `passScore` is set and `score < passScore`. Example: 55% on a 70% pass quiz → `FAILED`, not `LOW_SCORE`.
- **Score unit:** `Attempt.score` is **percentage** (0–100), aligned with `Quiz.passScore`.
- **Integrity flags:** Review-only wording. Never punitive labels in UI or API.
- **Low-score threshold:** `60` until product defines otherwise (`LOW_SCORE_THRESHOLD` constant).

---

## 5. API shape (planned)

```
GET /admin/follow-up?quizId=<uuid>
```

```typescript
{
  generatedAt: string;
  summary: { total: number; byReason: Record<FollowUpReason, number> };
  groups: Array<{
    reason: FollowUpReason;
    label: string;
    count: number;
    learners: Array<{
      studentId: string;
      studentName: string;
      studentEmail: string;
      quizId: string;
      quizTitle: string;
      score: number | null;
      submittedAt: string | null;
      attemptStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | null;
      nextStep: string;
      integrityReviewNote?: string;
    }>;
  }>;
}
```

Group order in response: flagged → started not submitted → did not start → failed → low score. Omit empty groups.

---

## 6. Seed data (local demo)

Fixed IDs in `prisma/seed.ts`:

| ID | Entity |
|----|--------|
| `66666666-6666-6666-6666-666666666666` | Follow-Up Demo Quiz (`passScore: 50`) |
| `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | Did Not Start Alice |
| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | In Progress Bob |
| `cccccccc-cccc-cccc-cccc-cccccccccccc` | Failed Carol (score 40) |
| `dddddddd-dddd-dddd-dddd-dddddddddddd` | Low Score Dan (score 55, passes 50 but below 60) |
| `eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee` | Flagged Eve (score 80, seed integrity map) |
| `ffffffff-ffff-ffff-ffff-ffffffffffff` | Passed Frank (score 85, excluded) |

**Expected counts** for `GET /admin/follow-up?quizId=6666...` (once API exists):

| Reason | Count |
|--------|-------|
| DID_NOT_START | 1 |
| STARTED_NOT_SUBMITTED | 1 |
| FAILED | 1 |
| LOW_SCORE | 1 |
| FLAGGED_FOR_REVIEW | 1 |
| *(excluded)* | 1 (Frank) |

Integrity flags (no DB table yet): `adapters/seed-integrity-flag.adapter.ts` map for Eve on the demo quiz.

### Run seed

```bash
cd backend
npx prisma db seed
```

Requires `DATABASE_URL` in `.env` and applied migrations.

---

## 7. Verification

- [ ] Unit tests: `npm test -- classify-learner-follow-up`
- [ ] No `DID_NOT_START` row has `score: 0`
- [ ] Submitted zero score → `FAILED` or `LOW_SCORE`, never `DID_NOT_START`
- [ ] Manual SQL count vs API count per group (with mentor)

---

## 8. Open items for Slot 3 / Slot 4

| Topic | Owner | Status |
|-------|-------|--------|
| Written sign-off on “did not start” | Slot 3 | Pending |
| Invitation status filter on enrollments | Slot 3 | Pending |
| `IntegrityFlag` persistence | Slot 4 | Pending — use `SeedIntegrityFlagAdapter` until then |
