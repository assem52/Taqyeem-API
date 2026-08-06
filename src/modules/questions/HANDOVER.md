# Question module handover

## Shared validity contract (required for publish)

Publishing and authoring must use the same rules:

- Module: `src/modules/questions/validate-quiz.ts`
- Barrel: `src/modules/questions/index.ts`
- Contract doc: `docs/QUESTION_VALIDITY_CONTRACT.md`

```ts
import { validateQuiz, validateQuestion } from '../questions';
```

Learner 2’s publish endpoint already imports `validateQuiz` and re-checks inside
the publish transaction. Question create/update call `validateQuestion` on the
server for MCQ and True/False before persistence.

## Migrations

All Prisma migrations under `prisma/migrations/` are committed. Rebuild with
`npm run migrate:deploy`.
