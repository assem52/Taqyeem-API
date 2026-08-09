# Funnel dictionary

Locked labels for tracker, analytics, follow-up, and student dashboard. Use these exact words in UI.

| Label | Meaning | Source of truth |
|-------|---------|-----------------|
| **Invited** | An invitation row exists for this email + quiz | `Invitation` |
| **Invite sent** | Latest email log for that invitation is SENT | `EmailLog` |
| **Invite failed** | Latest email log is FAILED | `EmailLog` |
| **Already invited** | Bulk invite skipped a duplicate email | Bulk invite result |
| **Accepted / Enrolled** | Student has enrollment for the quiz | `Enrollment` |
| **Not accepted** | Invited but no enrollment yet | Invitation without enrollment |
| **Not started** | Enrolled (or invited+registered path) but no attempt | No `Attempt` |
| **In progress** | Attempt exists with status IN_PROGRESS | `Attempt` |
| **Submitted** | Attempt SUBMITTED by learner | `Attempt` |
| **Auto-submitted** | Attempt AUTO_SUBMITTED by deadline sweep | `Attempt` |
| **Passed** | Submitted/auto-submitted and score ≥ passScore | Score + `Quiz.passScore` |
| **Not yet** (failed) | Submitted/auto-submitted and score &lt; passScore | Score + `Quiz.passScore` |
| **Low score** | Submitted and below the follow-up low-score threshold | Follow-up rules |
| **Needs review** | Integrity events ≥ quiz threshold | `IntegrityEvent` count |

## Rules

1. Never say “cheating.” Use **Needs review**.
2. **Invited** ≠ **Enrolled**. Analytics “invited” should count distinct invitation emails unless a screen explicitly says “enrolled.”
3. A learner who never sat must never appear as score `0`. Missing attempt ≠ failed.
4. Student dashboard states stay human: Not open yet, Open, In progress, Submitted, Closed, etc. — map to this dictionary in admin tools.
