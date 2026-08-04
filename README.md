# QnA Service — Backend

NestJS + PostgreSQL + Prisma API for Sprint 1 (RAG/knowledge base + **Student Quiz Access**).

---

## Prerequisites

- Node.js 20+
- PostgreSQL running locally
- A database created (e.g. `qna`)

```bash
createdb qna   # if it does not exist yet
```

---

## Initial setup

```bash
npm install
cp .env.example .env   # then edit values
npm run migrate:dev    # apply Prisma migrations
npx prisma db seed     # demo student + quizzes
npm run start:dev
```

App runs at **http://localhost:3000** (override with `PORT` in `.env`).

---

## Environment (`.env`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://USER@localhost:5432/qna?schema=public` |
| `MOCK_STUDENT_ID` | Yes* | UUID used when no `x-student-id` header is sent. Must match seed student (see below). |
| `PORT` | No | HTTP port (default `3000`) |
| `OPENAI_API_KEY` | For RAG | Only needed for ingestion/search modules |

\*Required for local dashboard testing until Auth (Slot 1) is integrated.

**Seed student UUID** (fixed in `prisma/seed.ts`):

```
MOCK_STUDENT_ID=11111111-1111-1111-1111-111111111111
```

---

## Database & Prisma

| Command | Purpose |
| :--- | :--- |
| `npm run migrate:dev` | Apply migrations in dev; creates migration SQL under `prisma/migrations/` |
| `npm run migrate:deploy` | Apply migrations in CI/production |
| `npm run generate` | Regenerate Prisma Client after schema changes |
| `npx prisma db seed` | Load demo data (see seed section) |
| `npm run studio` | Open Prisma Studio GUI |

After editing `prisma/schema.prisma`:

```bash
npm run migrate:dev -- --name describe_your_change
npm run generate
```

---

## Seed data (`prisma/seed.ts`)

Registered in `package.json`:

```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

Run with:

```bash
npx prisma db seed
```

**What it creates:**

- 1 verified student (`11111111-1111-1111-1111-111111111111`)
- 5 quizzes enrolled to that student — 4 **Published** (dashboard states) + 1 **Draft** (hidden from API)
- Attempts so the API returns all four `studentState` values: `Not started`, `In progress`, `Submitted`, `Closed`

Re-running seed **clears** quiz-related rows (students, enrollments, quizzes, attempts) and recreates them.

---

## Student Quiz Access API

Mock auth until real Auth lands: header `x-student-id` or fallback to `MOCK_STUDENT_ID`.

```bash
# uses MOCK_STUDENT_ID from .env
curl http://localhost:3000/student/quizzes

# explicit student
curl -H "x-student-id: 11111111-1111-1111-1111-111111111111" \
  http://localhost:3000/student/quizzes
```

Response: `{ "quizzes": [{ quizId, title, description, closesAt, studentState, score, canStart, blockedReason? }] }`

Code: `src/modules/student-quizzes/`

---

## Scripts

| Script | Description |
| :--- | :--- |
| `npm run start:dev` | Dev server with watch |
| `npm run build` | `prisma generate` + Nest build |
| `npm run start:prod` | Run compiled `dist/` |
| `npm run test` | Unit tests |
| `npm run lint` | ESLint |

---

### Latest Updates (Analytics Module)
- Implemented `QuizAnalytics` and `QuestionAnalytics` services and controllers.
- Backend now automatically calculates metrics like completion rates, scores, and question difficulties.