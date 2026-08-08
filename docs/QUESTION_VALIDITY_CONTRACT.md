# Shared question validity contract

**Owner:** Learner 3 (ASSEM) — Question Bank  
**Consumers:** Learner 2 publish gate (`PATCH /admin/quizzes/:id/publish`), question authoring APIs  
**Source of truth:** `src/modules/questions/validate-quiz.ts`  
**Public import:** `import { validateQuiz, validateQuestion } from '../questions/validate-quiz'`  
(or from `src/modules/questions` barrel)

Do **not** copy these rules into another module. Import and reuse them.

## Exported API

```ts
validateQuestion(question, label?): ValidationResult
validateQuiz({ questions }): ValidationResult
getVisibleQuestions(questions): QuestionForValidation[]
```

`ValidationResult` shape:

```json
{ "valid": true, "errors": [] }
```

or

```json
{ "valid": false, "errors": ["Question 1 has no correct answer marked"] }
```

## Visibility rules

Only **visible** questions participate in publish validation:

- `isHidden === false`
- `deletedAt == null`

Hidden / soft-deleted questions stay in the database for historical attempts.

## MCQ rules (server-side)

- Non-empty trimmed question text
- At least two options
- Every option has non-empty text
- No duplicate option text (case-insensitive)
- Exactly one `isCorrect: true`
  - zero → `has no correct answer marked`
  - more than one → `has multiple correct answers marked`

## True/False rules (server-side)

- Non-empty trimmed question text
- Exactly two options
- Option labels must be exactly the canonical pair `True` and `False`
- Exactly one `isCorrect: true`

## Open-ended

`OPEN_ENDED` is rejected by authoring and publish validation because scoring is objective-only.

## Where the server enforces this

| Path | Enforcement |
|------|-------------|
| `POST /admin/quizzes/:quizId/questions` | `validateQuestion` before create |
| `PATCH /admin/quizzes/:quizId/questions/:questionId` | `validateQuestion` before update |
| `PATCH /admin/quizzes/:id/publish` | reloads from DB, then `validateQuiz` inside a transaction |
| `GET /admin/quizzes/:id` | returns `isValid` + `validationErrors` preview (informational only) |

Publish never trusts screen-load validation alone. It always re-validates at click time.

## Database migrations (rebuild from scratch)

Committed under `prisma/migrations/`. Apply with:

```bash
npm run migrate:deploy
```

Question-bank schema additions live in:

- `20260806110000_question_bank_api` — `Question.position`, `deleted_at`, `updated_at`; `QuizOption.position`; auth `users`/`Role` drift repair; attempt snapshot backfill
- `20260806120000_add_quiz_instructions` — `Quiz.instructions`

A fresh database can be rebuilt with `migrate deploy` + `prisma db seed`.
