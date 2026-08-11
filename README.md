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
cp .env.example .env   # then edit values (see Environment below)
npx prisma migrate deploy   # apply committed migrations
npx prisma db seed          # demo users + quizzes
npm run start:dev
```

App runs at **http://localhost:3000** (override with `PORT` in `.env`).

---

## Demo accounts (from seed)

After `npx prisma db seed`, log in via the frontend (`/login`) or `POST /auth/login`:

| Role | Email | Password |
| :--- | :--- | :--- |
| Student | `assem.test@example.com` | `Student123!` |
| Admin | `admin@example.com` | `Admin123!` |

- Student is linked to seed UUID `11111111-1111-1111-1111-111111111111` and is enrolled in the demo quizzes.
- Prefer JWT login. Mock headers (`x-student-id` / `x-admin-token`) still work as a DEV fallback (dual-mode).

---

## Environment (`.env`)

**Do not commit real `.env` files.** Share only `.env.example` in git. Teammates copy it and fill secrets locally (or receive secrets in a private channel — Discord DM / password manager — never in a PR).

```bash
cp .env.example .env
# then set JWT_SECRET and ADMIN_API_TOKEN, e.g.:
# openssl rand -hex 32
```

| Variable | Required | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://USER@localhost:5432/qna?schema=public` |
| `JWT_SECRET` | Yes | Signs access tokens — backend refuses to start if missing |
| `ADMIN_API_TOKEN` | Recommended | Dual-mode admin header fallback; match frontend `VITE_ADMIN_TOKEN` |
| `MOCK_STUDENT_ID` | Optional | Dual-mode student header fallback (seed UUID below) |
| `PORT` | No | HTTP port (default `3000`) |
| `OPENAI_API_KEY` | For RAG search | Needed for ingestion/search embeddings |
| `GROQ_API_KEY` | For chat / AI generate / ask | Needed for `POST /chat`, `POST /ask`, `POST /admin/ai/generate-questions` |
| `GROQ_MODEL` | No | Defaults to `llama-3.3-70b-versatile` |

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

- 1 verified student (`11111111-1111-1111-1111-111111111111`) + linked login `assem.test@example.com` / `Student123!`
- 1 admin login `admin@example.com` / `Admin123!` (no student profile)
- Demo quizzes enrolled to that student (published + draft samples, follow-up fixtures, etc.)

Re-running seed **clears** users/students/quizzes/attempts (and related rows) and recreates them.

---

## Auth API (preferred)

```bash
# login
curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"assem.test@example.com","password":"Student123!"}'

# use the access_token
curl http://localhost:3000/student/quizzes \
  -H "Authorization: Bearer <access_token>"

curl http://localhost:3000/admin/quizzes \
  -H "Authorization: Bearer <admin_access_token>"

curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### Dual-mode fallbacks (DEV)

```bash
# student mock
curl -H "x-student-id: 11111111-1111-1111-1111-111111111111" \
  http://localhost:3000/student/quizzes

# admin shared secret
curl -H "x-admin-token: $ADMIN_API_TOKEN" \
  http://localhost:3000/admin/quizzes
```

Code: `src/auth/`, `src/modules/student-quizzes/`, admin guards under `src/modules/admin-quizzes/guards/`

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