# Answer storage contract

| Question type | Persist as | Forbidden |
|---------------|------------|-----------|
| MCQ | `selectedOptionId` = real `QuizOption.id` UUID | Synthetic ids |
| TRUE_FALSE | `selectedOptionId` = real `QuizOption.id` UUID (True/False options in bank) | `'true'` / `'false'` strings |
| OPEN_ENDED | `textAnswer` string on `Answer` (+ JSON autosave mirror) | Stuffing text into `selectedOptionId` |

Autosave JSON on `Attempt.attemptAnswers` may hold the same values for resume, but final graded rows must follow this table.
