# Question bank handover

All authoring routes are nested under `/admin/quizzes` and protected by
`AdminGuard`.

## Shared validity contract (for publishing)

The reusable question validity contract is exposed here:

- Implementation: `src/modules/questions/validate-quiz.ts`
- Public barrel: `src/modules/questions/index.ts`
- Written contract: `docs/QUESTION_VALIDITY_CONTRACT.md`

Publishing must import `validateQuiz` (never copy rules). Authoring APIs call
`validateQuestion` for MCQ and True/False on the server before saving. Publish
re-validates from the database at click time.

## API contracts

- `GET /admin/quizzes/:quizId/questions` lists non-deleted questions by
  `position`, with options in their own `position` order.
- `POST /admin/quizzes/:quizId/questions` creates an MCQ or TRUE_FALSE question.
- `PATCH /admin/quizzes/:quizId/questions/reorder` accepts
  `{ "questionIds": ["..."] }`; the array must contain every active question
  exactly once.
- `PATCH /admin/quizzes/:quizId/questions/:questionId` replaces supplied
  fields. Supplying `options` replaces the option set transactionally.
- `PATCH /admin/quizzes/:quizId/questions/:questionId/visibility` accepts
  `{ "isHidden": true | false }`.
- `DELETE /admin/quizzes/:quizId/questions/:questionId` soft-deletes the row by
  setting `deleted_at` and `is_hidden`.
- `POST /admin/quizzes/:quizId/duplicate` accepts an optional `{ "title": "..." }`
  and creates an independent DRAFT containing settings and active
  questions/options. Attempts, invitations, and enrollments are not copied.

Question mutations return 404 when the quiz or nested active question does not
exist. Structural edits return the shared `ATTEMPT_LOCK_MESSAGE` once any
attempt exists. Duplicating remains available for locked quizzes so the copy
can be edited.

MCQ requires at least two non-empty, distinct options and exactly one correct
answer. TRUE_FALSE additionally requires exactly the canonical `True` and
`False` labels. OPEN_ENDED is rejected because scoring is objective-only.

## Schema and attempt history

`Question` now has `position`, `deleted_at`, and `updated_at`; `QuizOption` has
`position`. Active ordering indexes cover `(quizId, deleted_at, position)` and
`(questionId, position)`. The feature migration also safely repairs the
historical drift where Prisma declared the `Role` enum and `users` table but no
migration created them.

Starting an attempt stores the ordered visible question/answer-key snapshot.
Resume reads strip `isCorrect` from that snapshot, while submission scores that
same immutable snapshot instead of live authoring rows. The migration
best-effort backfills snapshots for pre-existing attempts.

## Deployment and rollback

Deploy with `npm run migrate:deploy`, then `npm run build`. The migration is
additive and uses guarded auth DDL, so it is safe in both fresh migration
history and databases where auth objects were created manually.

Rollback is intentionally manual because dropping columns would discard
ordering, soft-delete metadata, and historical snapshots. Roll back the
application first; retain the additive columns/indexes. If removal is required
after a verified backup, drop the two feature indexes and added columns.
Do not drop `users` or `Role` unless ownership checks prove this migration
created them and no authentication data exists.
