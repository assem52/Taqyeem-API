# Taqyem API

Backend service for **Taqyem** — an assessment platform for cohort quizzes, integrity-aware attempts, AI-assisted authoring, and post-submit essay evaluation.

Built with **NestJS**, **PostgreSQL** (+ **pgvector**), and **Prisma**. Designed for multi-role access (admin / learner), durable attempt scoring, and controlled third-party AI usage.

---

## Product surface

| Domain | Capabilities |
| :--- | :--- |
| **Assessments** | Draft → publish lifecycle, timed windows, pass marks, results policies |
| **Authoring** | Quiz questions, global bank, AI draft generation (topic / text / PDF / OCR) |
| **Delivery** | Invitations, enrollment, single-attempt start, debounced answer persistence |
| **Integrity** | Visibility-loss capture, threshold flagging, attempt review |
| **Scoring** | Objective auto-score; essay (`OPEN_ENDED`) AI grade + human override |
| **Knowledge** | Document ingest, chunk embeddings, retrieval-augmented admin ask |
| **Ops** | Seeded demos, scheduled deadline sweeps, mail transport (live or simulated) |

---

## Architecture at a glance

```
Clients (Web) ──JWT──► NestJS API ──Prisma──► PostgreSQL (+ pgvector)
                              │
                              ├── Groq   (chat, generate, essay grade, RAG answer)
                              ├── OpenAI (embeddings for ingest / search)
                              └── SMTP   (optional transactional mail)
```

- **Auth:** JWT access tokens; production disables header-based mock identity.
- **Attempts:** Atomic claim on submit; question snapshot frozen at start; answers dual-written (JSONB + `Answer` rows).
- **AI boundary:** LLM calls are isolated behind a shared client; graded attempts never expose the in-quiz chat surface.
- **Scheduling:** Deadline auto-submit can be pinned to a single replica via `CRON_ENABLED`.

---

## Screenshots

Product UI screenshots live in the **frontend** repository under `docs/screenshots/` (landing, admin quizzes, AI generate, attempt review, learner flows).

---

## Documentation

| Doc | Purpose |
| :--- | :--- |
| [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md) | Internship handoff narrative |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram & modules |
| [docs/AI_QUESTION_GENERATION.md](docs/AI_QUESTION_GENERATION.md) | AI authoring behavior & limits |
| [docs/DELIVERY_CHECKLIST.md](docs/DELIVERY_CHECKLIST.md) | Freeze / release checklist |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branch & PR workflow |
| OpenAPI UI | `http://localhost:3000/api` after `start:dev` |

---

## Stack

| Layer | Choice |
| :--- | :--- |
| Runtime | Node.js 20+, NestJS 10 |
| Language | TypeScript |
| Data | PostgreSQL, Prisma Migrate |
| Search / RAG | pgvector, OpenAI embeddings |
| Generation | Groq (OpenAI-compatible) |
| Security | Helmet, class-validator, JWT, bcrypt, throttling |
| Jobs | `@nestjs/schedule` (attempt deadline sweeps) |
| Docs / contracts | `CONTRACT.md`, `docs/` |

---

## Technical maturity

This service is shaped for correctness under concurrency and cost-aware AI use—not a CRUD demo.

### Data integrity & scoring
- **Start-time question snapshots** so later authoring edits cannot rewrite a live attempt.
- **Atomic submit claims** (`UPDATE … WHERE status = IN_PROGRESS`) to prevent double-score races.
- **Objective + essay composite scoring** with persisted AI awards and admin override recomputation.
- **Results policies** (`IMMEDIATE` / `AFTER_CLOSE` / `ADMIN_ONLY`) gate learner review unlock.

### Security & access control
- Role-separated guards (admin vs learner JWT).
- Production hard-stops for mock `x-student-id` / `x-admin-token` shortcuts.
- Input validation via DTOs; security headers via Helmet; rate limiting via Throttler.
- Password hashing with bcrypt; time-bound email verification and reset tokens.

### AI & content pipeline
- Shared LLM client (Groq) for chat, draft generation, RAG answers, and essay grading.
- PDF text extraction and image OCR before generation (reduces token spend vs multimodal uploads).
- Essay grading uses rubric text as *soft* guidance (generous on-topic partial credit).
- RAG path: ingest → chunk → embed → vector retrieve → generate (admin ask).

### Operational readiness
- Prisma migrations as the schema source of truth.
- Seedable demo identities for local/staging.
- Optional SMTP with simulated delivery for demos without mail infrastructure.
- Multi-instance awareness for cron (single-writer sweeps).
- HTTP collection (`api-tests.http`) and Jest coverage on scoring / validation paths.

### Essential database indexes

Indexes are limited to high-traffic access paths—not blanket coverage.

| Relation | Index | Serves |
| :--- | :--- | :--- |
| `Attempt` | `(status, submittedAt)` | Admin recent-submissions feed |
| `Attempt` | `(quizId, status)` | Per-quiz lists, deadline sweeps |
| `Attempt` | `(studentId)` | Learner attempt hydration |
| `Attempt` | `(status, startedAt)` | In-progress / time-based scans |
| `Enrollment` | `(studentId)` | Learner quiz catalog |
| `Quiz` | `(status, createdAt)` | Admin list + status filters |
| `Question` | `(quizId, deletedAt, position)` | Active question ordering |
| `Answer` | `(gradingStatus)` | Ungraded essay review queues |
| `Invitation` | `(email)`, `(quizId, email)` | Invite accept + per-quiz lookups |
| `User` | `(verificationToken)`, `(passwordResetToken)` | Auth token resolution |
| Bank / RAG | category + document/chunk indexes | Authoring & retrieval |

Migration: `prisma/migrations/*_essential_query_indexes`.

---

## Prerequisites

- Node.js **20+**
- PostgreSQL **14+** with **`vector`** extension (local, Docker, Neon, or Supabase)
- OpenAI key (embeddings) and Groq key (generation) for full AI features

---

## Quick start

```bash
npm install
cp .env.example .env          # fill secrets — see Environment
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
```

API default: `http://localhost:3000`  
Interactive API docs: `http://localhost:3000/api`

### Demo accounts (seed)

| Role | Email | Password |
| :--- | :--- | :--- |
| Learner | `assem.test@example.com` | `Student123!` |
| Admin | `admin@example.com` | `Admin123!` |

---

## Environment

Copy `.env.example` → `.env`. **Never commit secrets.**

| Variable | Required | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection (pgvector-capable) |
| `JWT_SECRET` | Yes | Access-token signing |
| `FRONTEND_URL` | Prod | CORS + invite / verify link base |
| `GROQ_API_KEY` | AI features | Chat, generate, essay grade, ask |
| `GROQ_MODEL` | No | Default `llama-3.3-70b-versatile` |
| `OPENAI_API_KEY` | RAG | Embedding ingest / search |
| `ADMIN_API_TOKEN` | Dev only | Header fallback (disabled in production) |
| `EMAIL_DELIVERY_ENABLED` | No | `1` = SMTP send; `0` = simulate |
| `SMTP_*` | Mail | Host/user/from when live mail is on |
| `CRON_ENABLED` | Multi-instance | `false` on non-leader replicas |
| `PORT` | No | Default `3000` |

Generate secrets with `openssl rand -hex 32`.

---

## Common commands

| Command | Purpose |
| :--- | :--- |
| `npm run start:dev` | Watch mode |
| `npm run build` / `start:prod` | Production build & run |
| `npm run migrate:dev` | Create/apply migrations (dev) |
| `npm run migrate:deploy` | Apply migrations (CI/prod) |
| `npx prisma db seed` | Demo data |
| `npm test` | Unit / integration suite |
| `npm run bootstrap:admin` | Ensure an admin user exists |
| `npm run backup` / `restore` | DB backup helpers |

---

## API map (selected)

| Area | Examples |
| :--- | :--- |
| Auth | `POST /auth/register`, `/login`, `/verify`, password reset |
| Learner | `GET /student/quizzes`, start/get attempt, `PUT …/answers`, `POST …/submit` |
| Admin quizzes | CRUD, publish, invitations, analytics |
| Admin review | `GET /admin/attempts/:id`, essay grade `PATCH`, `GET …/recent-submissions` |
| AI | `POST /chat`, `POST /ask`, `POST /admin/ai/generate-questions` |
| Follow-up | `GET /admin/follow-up` |

Contract details live under `docs/` and `CONTRACT.md`. Prefer **Swagger** at `/api` for interactive exploration; keep scoring/integrity contracts in Markdown for behavior that OpenAPI cannot express.

---

## Repository layout

```
src/
  auth/                 JWT, verification, password reset
  modules/
    admin-quizzes/      Authoring & publish
    student-quizzes/    Attempts, scoring, essay AI grade
    question-bank/      Global bank
    ai-generate/        Draft generation + OCR/PDF
    ask/                Chat + RAG ask + LLM client
    integrity/          Events + review
    admin-follow-up/    Morning follow-up classification
    invitations/        Cohort invites
  analytics/            Cohort & question analytics
  common/               Prisma, mail
prisma/                 Schema, migrations, seed
```

---

## Testing & quality

- Jest for scoring, validation, submit/auto-submit races, and follow-up classification.
- Prefer contract tests over snapshot noise for attempt lifecycle.
- Lint: `npm run lint`.

---

## Deployment notes

1. Provision Postgres with `CREATE EXTENSION IF NOT EXISTS vector;`
2. Set production env (`NODE_ENV=production`, strong `JWT_SECRET`, real `FRONTEND_URL`).
3. `prisma migrate deploy` then `node dist/main` (or container `Dockerfile`).
4. Run deadline sweeps on **one** replica (`CRON_ENABLED=true` elsewhere `false`).
5. Rotate any API keys that have appeared in chat logs or tickets.

---

## Related

- Frontend app: sibling `frontend/` repository (Vite + React).
- Product contracts: `CONTRACT.md`, `docs/ATTEMPTS_SCORING_INTEGRITY_CONTRACT.md`.
- Handoff: `docs/PROJECT_OVERVIEW.md`, `docs/DELIVERY_CHECKLIST.md`.
