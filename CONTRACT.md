# Attempt Scoring — Contract Notes (revised against the real schema)

The original version of this doc assumed a shape (`options[].id` / `correctOptionId`
strings) that isn't what Slot 3 actually built. Real schema:

```prisma
model Question {
  id       String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  quizId   String       @db.Uuid
  text     String
  points   Decimal      @db.Decimal(7, 2)
  type     QuestionType @default(MCQ)   // MCQ | TRUE_FALSE | OPEN_ENDED
  options  QuizOption[]
}

model QuizOption {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  questionId String   @db.Uuid
  option     String
  isCorrect  Boolean  @default(false)
}
```

## Good news: the original day-one id-format risk mostly goes away

There's no separate string id scheme to keep in sync — `QuizOption.id` is a real
Postgres UUID, and correctness is just "does the row the student picked have
`isCorrect = true`." Nothing to drift between Slot 3 and Slot 5; the foreign key
*is* the agreement.

## Two things that are still open, flagged rather than assumed

**1. `OPEN_ENDED` questions have no correct-answer field.**
There's nowhere in `Question`/`QuizOption` to store what a correct free-text
answer is. Current behavior: these are excluded from `rawScore`/`maxScore`
entirely, and counted in a separate `ungradedCount` on the score result. This
means a quiz that's all open-ended questions currently always scores 100%
(0 out of 0) rather than 0% — because there's nothing to grade automatically
yet. **If manual grading is planned for Sprint 2, `ungradedCount` is the signal
to build on; if it's not planned, this needs a different decision.**

**2. `Quiz.passScore` is assumed to be a percentage (0–100), matching `Attempt.score`.**
Both are stored as the same unit in the current implementation. If `passScore`
is meant to represent raw points instead, the `passed` comparison in
`computeScore()` is wrong and needs to compare against `rawScore` instead of
`percentage`. Worth a one-line confirmation from whoever owns `Quiz`.

## One dependency this PR doesn't cover: `AUTO_SUBMITTED`

`AttemptStatus` includes `AUTO_SUBMITTED` (presumably for quizzes closing on a
timer) alongside `SUBMITTED`. This PR's `submitAttempt()` only claims attempts
that are `IN_PROGRESS`. If something else in the system flips status straight
to `AUTO_SUBMITTED` (a cron job, a scheduled task) **without** going through
`submitAttempt()`, that attempt will never get a `questionSnapshot` or a score
— `recomputeStoredScore()` will just time out waiting for one. If an
auto-submit flow exists or is planned, it needs to call the same scoring path
this PR adds, not bypass it.

## Answer storage shape (for reference)

`Attempt.attemptAnswers` (JSONB) is written as:

```json
{
  "<questionId>": { "selectedOptionId": "<quizOptionId-or-null>", "answeredAt": "ISODate" }
}
```

Assumes single-select per question (`selectedOptionId` is one value, not an
array). If multi-select MCQs are ever needed, this shape has to change to an
array, and scoring logic changes with it.
