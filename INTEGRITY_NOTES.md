# Integrity Capture & Admin Review — Notes

## ⚠️ Needs a human before merge: wording sign-off

*"The word on screen is 'review', never 'cheating'. The mentor reads the
wording and confirms it."*

I can enforce that no string in this code contains "cheat" — there's a test
for it (`integrity-flag.spec.ts`). What I can't do is confirm the actual
tone/phrasing is right for your context. Current copy, all of it:
- Badge label: **"Flagged for review"**
- No other user-facing strings exist yet (the capture endpoint deliberately
  returns nothing but `{ received: true }` — see below).

This needs the mentor's actual sign-off, not just a lint check for a banned
word. Flagging it here so it doesn't get missed.

## Why the flag is computed, never stored

`isFlagged` is calculated live from `(eventCount, quiz.integrityThreshold)`
every time the admin view is requested — never written to the `Attempt` row.
This makes "raising the threshold un-flags an attempt" true by construction:
there's no stored boolean that could go stale, and nothing to remember to
re-run. Proven with a test that raises the threshold on the same mocked
attempt and asserts `.update()` was never called.

## Why the dedup is one atomic SQL statement, not read-then-write

`recordVisibilityLost()` uses a single `INSERT ... WHERE NOT EXISTS`, not a
separate check followed by an insert. This avoids a race window without
needing `$transaction`/row-lock machinery — justified because the stakes are
lower here than in scoring: an occasional extra duplicate slipping through
under a genuinely simultaneous double-fire would not violate any stated
acceptance criterion (unlike the scoring work, where a race could actually
double-score someone).

## Why capture failures are swallowed with a blanket `catch`

Every other piece of backend work in this project has been careful to
surface errors clearly. This file is a deliberate, narrow exception, because
the requirement is explicit and absolute: *"a failed event never costs a
student an answer."* A malformed attempt id, a DB hiccup, an attempt that's
already submitted — all produce the same silent no-op, and the client always
gets `{ received: true }` regardless. This is the one place in the whole
project where hiding a failure is the correct behavior, not a shortcut.

## Handover to Slot 5

`IntegrityReviewService.listAttemptsForQuiz(quizId)` returns
`AttemptIntegrityRow[]` with both `attemptId` and `studentId` on every row —
not just a display name — specifically so Slot 5's follow-up list can
consume this programmatically (join on `studentId`) rather than needing to
parse the admin UI's rendered output. Filter client-side (or add a
query param later) on `isFlagged: true` to get just the flagged subset.

**This is a list for review, not a punishment queue** — nothing in this
data implies guilt; it's a "these attempts have unusually high tab-switch
counts, worth a human look" signal, and Slot 5's follow-up list should
carry that framing forward, not harden it into an accusation.

## Not done / needs a decision

- **Seed data**: acceptance criteria assume real event data exists
  eventually, but nothing here adds seeded `IntegrityEvent` rows to
  `prisma/seed.ts`. Worth adding a few synthetic flagged/unflagged attempts
  there so the admin view has something to show before real students
  generate real events — didn't add this without being asked, since it
  touches a file with existing, working seed logic.
- **Admin route conventions**: `@Controller('admin/quizzes')` is a
  reasonable guess, not a confirmed pattern — no existing admin controller
  was visible to build this consistently against.
- **Event types**: schema only has `VISIBILITY_LOST` for now. If more
  integrity signals get added later (e.g. copy/paste detection), the route
  `POST /attempts/:id/integrity-events/visibility-lost` would need
  generalizing rather than adding a new route per type — worth deciding
  before a second event type actually shows up, not after.
