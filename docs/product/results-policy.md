# Results policy contract

Quiz setting: when learners may see score, correctness, and explanations.

| Value | Score | Correct / incorrect | Explanations |
|-------|-------|---------------------|--------------|
| `IMMEDIATE` | Right after submit | After submit | After submit |
| `AFTER_CLOSE` | After submit | After `closesAt` | After `closesAt` |
| `ADMIN_ONLY` | After submit (pass/fail + number only) | Never in learner UI | Never in learner UI |

## Defaults

- New graded quizzes default to **`AFTER_CLOSE`**.
- Practice quizzes (if enabled later) should use **`IMMEDIATE`**.

## API rules

- Attempt GET while in progress never returns `isCorrect` or explanations.
- Results endpoint applies this policy server-side. Frontend must not invent review data.
- Admin attempt review always sees full truth.

## Product copy

- IMMEDIATE: “You’ll see how you did right after you submit.”
- AFTER_CLOSE: “You’ll get your score now. Full review unlocks when the quiz closes.”
- ADMIN_ONLY: “You’ll see your score. Detailed review stays with your instructor.”
