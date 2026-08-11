# Architecture

High-level system shape for Taqyem (API + sibling web client).

## Context

```
                 ┌────────────────────┐
                 │  React (Vite) Web  │
                 │  JWT · RTK Query   │
                 └─────────┬──────────┘
                           │ HTTPS / JSON
                           ▼
                 ┌────────────────────┐
                 │     NestJS API     │
                 │  Helmet · CORS ·   │
                 │  ValidationPipe    │
                 └─────────┬──────────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ PostgreSQL │  │   Groq     │  │  OpenAI    │
    │ + pgvector │  │  LLM gen   │  │ embeddings │
    └────────────┘  └────────────┘  └────────────┘
           │
           └──── optional SMTP (invites / verify)
```

## Backend modules

| Module | Responsibility |
| :--- | :--- |
| `auth` | Register, verify, login, JWT, password reset |
| `admin-quizzes` | Quiz lifecycle, invitations, analytics, attempt review |
| `student-quizzes` | Enrollment catalog, attempts, submit, essay AI grade |
| `question-bank` | Global reusable questions |
| `ai-generate` | Topic / text / PDF / OCR → draft questions |
| `ask` | Chat + RAG ask + shared `LlmService` |
| `integrity` | Visibility-loss events & review flags |
| `admin-follow-up` | Morning follow-up classification |
| `invitations` | Tokenized cohort invites |
| `analytics` | Cohort / question stats |
| `common` | Prisma, mail |

## Frontend feature areas

| Area | Responsibility |
| :--- | :--- |
| `auth` | Login, register, verify, reset |
| `adminQuizzes` | Catalog, launch wizard, workspace, review |
| `questionBank` | Forms + bank UI |
| `studentQuizzes` | Dashboard, attempt shell, results |
| `ai` | Chat widget, generate modal |
| `adminFollowUp` | Follow-up dashboard |
| `shared` | Shell, sidebar, notification bell, API base |

## Cross-cutting decisions

- **Attempts:** Question snapshot at start; atomic submit claim; dual answer storage (JSONB + `Answer` rows).
- **Scoring:** Objective auto-score; essays graded post-submit via Groq; admin override recomputes totals.
- **AI boundary:** All provider keys server-side; chat hidden on graded attempt UI.
- **Auth shortcuts:** `x-admin-token` / mock student headers are **dev-only** and blocked when `NODE_ENV=production`.
- **Cron:** Deadline auto-submit should run on one replica (`CRON_ENABLED`).

## Deeper contracts

- `CONTRACT.md`
- `docs/ATTEMPTS_SCORING_INTEGRITY_CONTRACT.md`
- `docs/QUESTION_VALIDITY_CONTRACT.md`
- `docs/AI_QUESTION_GENERATION.md`
- Interactive OpenAPI: `GET /api` (Swagger UI) when the API is running
