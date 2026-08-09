# Known issues (honest demo / deploy log)

Updated: 2026-08-09

| Issue | Impact | Workaround |
|-------|--------|------------|
| Email **simulated** when `SMTP_HOST` unset | Invites/verify/reset are logged, not delivered; invite email status is FAILED | **Copy invite link** from Access; set SMTP for live cohorts |
| ARCHIVED quiz status not implemented | No archive transition API | Keep Draft / Published |
| Open-ended grading is not auto-scored | Counts as ungraded | Prefer MCQ/TF for demos |
| Knowledge/RAG not in quiz authoring UI | Differentiator deferred | RAG HTTP is admin-JWT only |
| Practice / multi-attempt mode not shipped | Single-attempt graded quizzes | Use `resultsPolicy: IMMEDIATE` |

See `docs/deploy/DEPLOY.md` and `docs/demo/smoke-checklist.md` in the monorepo (or copies under this repo).
