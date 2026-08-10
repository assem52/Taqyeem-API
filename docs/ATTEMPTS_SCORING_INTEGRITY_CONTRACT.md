# Attempts, Scoring & Integrity Contract

## Ownership

Learner 5 owns the complete attempt lifecycle, scoring, deadline enforcement, integrity capture, and integrity review.

---

## 1. Attempt Lifecycle

An `Attempt` represents one student's execution of one quiz.

The database enforces one attempt per `(quizId, studentId)`.

Supported statuses:

- `IN_PROGRESS`
- `SUBMITTED`
- `AUTO_SUBMITTED`

Important fields:

- `startedAt` — when the attempt started.
- `submittedAt` — when it was finalized.
- `status` — current lifecycle state.
- `attemptAnswers` — continuously saved answer state.
- `questionSnapshot` — immutable scoring inputs captured at start.
- `score` — persisted final percentage.

### Start

`POST /attempts`

Starting the same quiz again returns/reuses the existing in-progress attempt instead of creating a duplicate.

---

## 2. Continuous Answer Saving

`PUT /attempts/:attemptId/answers/:questionId`

Answers are saved while the student is solving so progress can survive refreshes or temporary disconnects.

The current autosave flow writes answer state into `Attempt.attemptAnswers`.

Answer writes are allowed only while:

- the attempt belongs to the authenticated student,
- the attempt is `IN_PROGRESS`,
- the quiz deadline has not passed.

The deadline condition is part of the database update so a late answer cannot slip through between a separate time check and write.

---

## 3. Question Snapshot

When an attempt starts, the backend stores a snapshot of the visible scoring inputs, including:

- question id and text,
- question type,
- points,
- options,
- correct-answer information,
- position.

Historical scoring uses this snapshot instead of the current `Question` records.

Therefore later question edits do not change how an existing attempt is scored.

---

## 4. Submission & Scoring

`POST /attempts/:attemptId/submit`

Submission is idempotent.

The attempt is claimed atomically only while it is still `IN_PROGRESS`. Repeated or concurrent submissions do not create duplicate scoring results.

Scoring uses:

- `questionSnapshot`,
- persisted answers,
- quiz `passScore` when configured.

The final score is persisted on `Attempt.score`.

Manual and automatic submission use the same scoring logic.

---

## 5. Deadline Enforcement & Auto-Submit

Expired attempts are recorded as `AUTO_SUBMITTED`.

A server-side NestJS scheduler runs every minute and finds expired quizzes that still contain `IN_PROGRESS` attempts.

The scheduler calls the existing sweep/auto-submit logic; it does not implement separate scoring rules.

This means attempts are finalized even if the learner closes the browser or loses connection.

Exact deadline enforcement does not depend on scheduler timing: late answer writes and submissions are guarded by the deadline themselves.

Raw SQL deadline comparisons normalize PostgreSQL time to UTC using:

`NOW() AT TIME ZONE 'UTC'`

This avoids incorrect comparisons when the database session uses a timezone such as `Africa/Cairo`.

---

## 6. Sweep Reliability

`POST /admin/attempts/sweep-expired/:quizId`

A failure in one attempt does not stop the remaining attempts from being processed.

The sweep reports two counters:

- `autoSubmittedCount` — attempts successfully finalized.
- `failedCount` — attempts that failed and can be retried.

Individual failures are logged with the attempt id and stack trace.

If an immediate auto-submit triggered by a late answer save fails, the student still receives a deadline `409 Conflict`, while the scheduler can retry later.

---

## 7. Integrity Capture

`POST /attempts/:attemptId/integrity-events/visibility-lost`

The currently supported integrity event type is `VISIBILITY_LOST`.

Events are stored in `IntegrityEvent` and linked to the active attempt by `attemptId`.

Events are accepted only for the correct student's active `IN_PROGRESS` attempt.

Repeated visibility-loss events within two seconds are deduplicated.

Integrity capture failures are logged but do not interrupt the student's quiz flow.

---

## 8. Integrity Review

`GET /admin/quizzes/:quizId/attempts`

The quiz stores its review threshold in `Quiz.integrityThreshold`.

The following values are derived at review time:

- `eventCount`
- `isFlagged`
- review badge

`isFlagged` is not stored on `Attempt` or `IntegrityEvent`.

It is calculated from the current integrity-event count and the quiz threshold.

Therefore changing the threshold can change the review flag without changing the academic score.

---

## 9. Review, Not Punishment

Integrity signals are for human review only.

A flagged attempt:

- does not lose score automatically,
- is not automatically failed,
- is not treated as proof of cheating.

Product wording should use terms such as:

- `Needs review`
- `Flagged for review`

and avoid automatic accusations.

---

## 10. Stable Result Contract

Final attempt data provides stable inputs for downstream consumers such as analytics:

- `attemptId`
- `studentId`
- `quizId`
- submission status
- persisted score

Both `SUBMITTED` and `AUTO_SUBMITTED` are terminal scored attempt states.

Because scoring is snapshot-based, historical result data remains reproducible.

---

## 11. Validation

Coverage includes:

- single-attempt creation,
- continuous answer saving,
- snapshot scoring,
- idempotent submit,
- manual and automatic scoring,
- deadline enforcement,
- server-side scheduled auto-submit,
- UTC deadline handling,
- integrity event capture,
- two-second event deduplication,
- threshold-based review flags,
- sweep partial-failure handling.

The main success and failure paths have also been verified against the real API and PostgreSQL database.
