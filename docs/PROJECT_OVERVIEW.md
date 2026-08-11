# Project overview — Taqyem (internship delivery)

## 1. What we built

**Taqyem** is a cohort assessment platform: admins author and launch timed quizzes, invite learners, review integrity-aware attempts, and use AI to draft questions and grade essays. Learners take single-attempt assessments with autosaved answers and policy-gated results.

## 2. Problem statement

Instructors need a focused tool to run closed-cohort quizzes with less manual authoring overhead, clearer attempt review (including open-ended answers), and basic integrity signals—without building a full LMS.

## 3. Main features

- JWT auth with email verification and password reset
- Quiz draft → publish lifecycle, invitations, enrollment
- Question bank + AI draft generation (topic / paste / PDF / image OCR)
- Timed attempts, answer persistence, objective + essay scoring
- AI essay grading with human override
- Integrity events (e.g. visibility loss) and admin review
- Optional RAG ask over ingested documents
- Seeded demo accounts for local/staging demos

## 4. Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md). Twin repositories: NestJS API + React web client.

## 5. Technology choices

| Choice | Why |
| :--- | :--- |
| NestJS + Prisma | Modular API, typed schema/migrations |
| PostgreSQL + pgvector | Relational attempts + vector RAG |
| Groq | Low-cost / free-tier generation & grading |
| OpenAI embeddings | Stable ingest/search for RAG |
| React + RTK Query | Role-safe UI with cache coherence |
| Vite + Tailwind | Fast SPA tooling |

## 6. AI integration

Documented in [AI_QUESTION_GENERATION.md](./AI_QUESTION_GENERATION.md). Keys never leave the server; generated items require admin save; essays are graded after submit.

## 7. Team contributions

Capture sprint ownership in your final presentation (roles: API, web, AI/RAG, scoring/integrity, docs/ops). Keep this file factual about the product; credit people in the release notes or slide deck.

## 8. Challenges & solutions

| Challenge | Approach |
| :--- | :--- |
| Concurrent submit races | Atomic `UPDATE … WHERE status = IN_PROGRESS` |
| Author edits mid-attempt | Freeze question snapshot at start |
| Exam integrity vs chat | Hide chat on graded attempt surfaces |
| AI cost / uploads | Extract PDF/OCR text before LLM; cap count & file size |
| Local demo without SMTP | Simulated email delivery + seed users |

## 9. Known limitations

- AI quality depends on provider availability and source clarity
- Header-based mock auth is for development only
- Swagger documents routes; richer `@ApiProperty` coverage can grow over time
- Prompt-injection from uploaded docs is mitigated by admin review, not a full sandbox

## 10. Future improvements

- Richer OpenAPI annotations and e2e suite coverage
- Stronger rate limits / quotas per admin for AI endpoints
- Multi-language OCR and generation
- Broader analytics and export
- Hardened prompt-injection defenses for document ingest

## Fresh-clone path

1. Clone API + web repos (or workspace with both).
2. Follow each README: `.env` from `.env.example`, migrate, seed, `start:dev` / `dev`.
3. Log in with seed accounts from the README.
4. Open Swagger at `http://localhost:3000/api`.
