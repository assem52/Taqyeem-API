# Delivery / handoff checklist

Use before tagging a release (e.g. `v1.0.0`).

## Code

- [ ] `main` is stable; feature work merged
- [ ] No secrets in tree (`.env` gitignored; keys only in local `.env`)
- [ ] No leftover debug/`debugger` in shipped paths
- [ ] `npm run lint` / `npm test` / `npm run build` pass
- [ ] CI green on `main`

## Git

- [ ] Meaningful history on `main`
- [ ] Annotated tag `v1.0.0` (or next semver) after freeze
- [ ] Sibling frontend tagged consistently if delivering both

## Docs

- [ ] README: description, stack, setup, env, seed, testing, deploy
- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/AI_QUESTION_GENERATION.md`
- [ ] `docs/PROJECT_OVERVIEW.md`
- [ ] Swagger at `/api`
- [ ] `.env.example` complete and secret-free

## Security

- [ ] Production: `NODE_ENV=production`, strong `JWT_SECRET`, real `FRONTEND_URL`
- [ ] Mock admin/student headers disabled in production
- [ ] AI keys server-side only; upload size/type limits enforced
- [ ] Rotate any keys that leaked in chat or tickets

## Handoff

- [ ] Fresh clone follows README only
- [ ] Seed demo accounts work
- [ ] AI generate + essay grade smoke-tested with real keys
- [ ] Known limitations listed in PROJECT_OVERVIEW
