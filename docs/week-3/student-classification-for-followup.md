# Student Classification for Admin Follow-Up (Week 3)

**Status:** Draft contract; Slot 3 definition sign-off pending  
**Owner:** Assem  
**Consumers:** Admin follow-up list API, Slot 3 reminders (Sprint 4)  

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
| Eligible invitation | Enrollment/invitation qualifies under Slot 3's agreed status rules |

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
- **Low-score threshold:** `60` until product defines otherwise.

---

## 5. API contract

| Request | Behavior |
|---------|----------|
| `GET /admin/follow-up` | Follow-ups across all published quizzes |
| `GET /admin/follow-up?quizId=<uuid>` | Same response filtered to one published quiz |
| Invalid `quizId` | `400 Bad Request` |

The unit of classification is an enrolled `(studentId, quizId)` pair. A learner
may therefore appear for more than one quiz in the unfiltered response.

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

## 6. Dependency agreements

| Topic | Owner | Contract requirement |
|-------|-------|----------------------|
| “Did not start” definition | Slot 3 | Confirm section 3 in writing |
| Invitation eligibility | Slot 3 | Publish which invitation statuses enter the candidate population |
| Integrity flags | Slot 4 | Provide active-review status and an optional neutral review note |
