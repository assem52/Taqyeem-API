# Student Quiz States — Handover to Slot 2

Published for Slot 2's instruction screen to consume. This is the full set of
states a student can be in, across two independent axes — read both, not
just `studentState`, or real cases will be missed.

## Axis 1: `studentState` — what's true about this quiz right now

| State | Meaning |
|---|---|
| `Not open yet` | `now < quiz.openDate` — window hasn't started |
| `Not started` | Inside the window, no attempt exists yet |
| `In progress` | Attempt exists, `status = IN_PROGRESS` |
| `Submitted` | Attempt is `SUBMITTED` or `AUTO_SUBMITTED` — same state either way |
| `Closed` | `now > quiz.closesAt`, and not `Submitted` — includes an attempt that was `IN_PROGRESS` when the window closed but never got submitted (see Known Gap below) |

Priority order when multiple could apply: `Submitted` > `Closed` > `In progress` > `Not open yet` > `Not started`. A submitted attempt always shows as `Submitted`, even after the window closes — submission history doesn't get overwritten by the clock.

## Axis 2: `canStart` + `blockedReason` — can THIS student act on it right now

Independent of `studentState`. Checked in this order:
1. Student is `UNVERIFIED` → always blocked, regardless of quiz state: *"Verify your email before starting this quiz."*
2. `studentState = Not open yet` → blocked: *"This quiz opens on {ISO date}."*
3. `studentState = Closed` → blocked: *"This quiz closed on {ISO date}."*
4. `studentState = Submitted` → blocked: *"You have already submitted this quiz."*
5. Otherwise → `canStart: true`, no reason needed

**Why two axes, not one flat enum:** an unverified student's quiz can independently be `Not started` AND blocked. Flattening these into a single state (e.g. an `Unverified` state) would lose that — you'd have to choose whether "unverified + closed" is one state or the other, and you'd lose the actual close date. Keep them separate.

## Dashboard vs. deep link — two different endpoints, two different failure shapes

- **`GET /student/quizzes`** (dashboard/list): only ever returns quizzes the student is already allowed to see. No separate "invalid" or "restricted" case exists here — those quizzes are simply never in the list.
- **`GET /student/quizzes/:quizId`** (deep link / direct access): the endpoint that has to explain *why* a specific link doesn't work. Three outcomes:
  - **404 "This quiz link is invalid."** — quiz doesn't exist, isn't published, or the id isn't even a valid UUID.
  - **403 "You have not been invited to this quiz."** — quiz is real and published, student isn't enrolled.
  - **200, normal body** — quiz is visible. `Closed` / `Not open yet` / `Submitted` / unverified all land here, via `canStart` + `blockedReason` — same shape as a dashboard row, since the quiz IS visible, just not currently actionable.

**Open tradeoff, not silently decided:** distinguishing 404 (invalid) from 403 (restricted) confirms a quiz's existence to a student who isn't invited to it — a real information leak. This was implemented as 3 distinct outcomes because that's what was asked for, but worth a second look from whoever owns quiz visibility rules (Slot 3) before Sprint 2, per the stated dependency.

## Empty state

`GET /student/quizzes` returns `{ quizzes: [], message: "You don't have any quizzes yet. Check back after you've been invited to one." }` when a student has no enrollments — never just a bare empty array.

## Error handling — never a blank page, never a stack trace

- A malformed `quizId` (not a UUID) is caught before it reaches the database and returns the same friendly 404 as a nonexistent quiz — not a raw Postgres/Prisma error.
- Every thrown exception is a standard Nest `HttpException` subtype (`NotFoundException`, `ForbiddenException`, `BadRequestException`), which Nest's default exception filter always renders as structured JSON (`{ statusCode, message, error }`), never a stack trace, even for genuinely unexpected errors.
- **Not independently confirmed:** this assumes nothing elsewhere in the app (e.g. `main.ts`) overrides Nest's default global exception filter with something less safe. Worth a quick check if that's not certain.

## Known gap, connects to the scoring PR's `AUTO_SUBMITTED` note

If a student has an `IN_PROGRESS` attempt and the window closes before they submit, `studentState` becomes `Closed` — but nothing here actually finalizes that attempt (no snapshot, no score gets written). This is the same `AUTO_SUBMITTED` gap flagged in the quiz-scoring work: something needs to auto-submit and score attempts whose window has passed, or those students are stuck showing `Closed` with no way to ever see a result.

## ⚠️ Open question, found on re-audit — needs a decision before this is "correct," not just "built"

The task's mandatory bullet says: *"Dashboard lists **only** quizzes... that are Published **and inside their window**."* Read literally, that says quizzes outside their window (not yet open, or closed) should be **excluded** from the dashboard entirely.

But the acceptance criteria requires: *"A closed quiz says it has closed and names the date."* That's only possible if closed quizzes **remain visible** as a row with a message — which contradicts a strict "exclude" reading of the mandatory bullet.

**What's actually built:** the second reading — every invited, published quiz stays on the dashboard regardless of window, annotated with `Not open yet` / `Closed` / etc. instead of being filtered out. This is the only reading consistent with the acceptance criteria, so it's the more defensible interpretation — but it is a chosen interpretation of contradictory task text, not a settled fact. If "only... inside their window" was meant literally as a hard filter, that changes the endpoint's actual query, not just its messaging. Confirm with whoever wrote the task before treating this as final.

## Testing status

- `student-quiz-state.spec.ts`: pure state/access logic — 12 tests, all passing.
- `student-quizzes.service.spec.ts`: the service methods themselves (`getDashboard`, `getQuizAccess`) with a mocked Prisma — 8 tests, all passing. Covers the empty-state message, the not-yet-open-is-included behavior above, and the 404-vs-403 distinction on the deep-link endpoint.
- **Not tested**: against a live database, or through the actual HTTP controller. Same caveat as the scoring work — type-checked and unit-tested, never executed end-to-end.

## Assumptions made, not confirmed

- `Quiz.duration` is minutes (schema doesn't say — exposed as `durationMinutes` in the API specifically so this is easy to correct later without an ambiguous rename).
- ISO 8601 UTC (`Z` suffix) timestamps satisfy "close time with timezone" — timezone conversion for display is treated as a frontend concern, not something the backend needs to solve.
