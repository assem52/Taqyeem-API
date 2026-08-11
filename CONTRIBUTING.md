# Contributing

## Workflow

1. Create a branch from `main` (`feature/…`, `fix/…`, `docs/…`).
2. Implement; keep PRs focused.
3. Run `npm run lint`, `npm test`, and `npm run build` locally.
4. Open a pull request; request review; merge into `main`.

## Commit messages

Prefer conventional prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.

## Environment

- Copy `.env.example` → `.env`. Never commit secrets or real API keys.
- Prefer JWT login over header mock tokens.
- Demo seed: `npx prisma db seed` (credentials in README).

## Docs worth updating

- User-facing setup → `README.md`
- AI generation behavior → `docs/AI_QUESTION_GENERATION.md`
- Scoring / integrity contracts → `docs/*_CONTRACT.md`
