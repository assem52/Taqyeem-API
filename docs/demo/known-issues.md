# Known issues (honest demo log)

Updated: 2026-08-09

| Issue | Impact | Workaround |
|-------|--------|------------|
| Email often runs in **simulated** mode | Learners may not receive mail | **Copy invite link** or **Resend** from Access; check server logs for simulated URLs |
| ARCHIVED quiz status not implemented | No archive transition API | Keep quizzes as Draft / Published (Archived filter hidden) |
| Open-ended grading is not auto-scored | Counts as ungraded in score object | Prefer MCQ/TF for demos; explanations still teach on review |
| Knowledge/RAG suggest-questions not wired into quiz authoring UI yet | Differentiator deferred | Use manual question authoring |
| Practice / multi-attempt mode not shipped | Graded quizzes stay single-attempt | Use `resultsPolicy: IMMEDIATE` for softer review after submit |

Password reset is available (`/forgot-password` → `/reset-password`). In development, reset tokens are logged by the API.

Integrity wording is **Needs review** only — never accuse cheating in product copy.
