-- Repair the historical auth-schema drift. PostgreSQL has no portable
-- CREATE TYPE IF NOT EXISTS, so use a guarded block.
DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('ADMIN', 'STUDENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'STUDENT',
  "status" "StudentStatus" NOT NULL DEFAULT 'UNVERIFIED',
  "verification_token" TEXT,
  "token_expires_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "quizId" ORDER BY "id"
  ) - 1 AS new_position
  FROM "Question"
)
UPDATE "Question" AS question
SET "position" = ranked.new_position
FROM ranked
WHERE question."id" = ranked."id";

UPDATE "Question"
SET "updated_at" = CURRENT_TIMESTAMP
WHERE "updated_at" IS NULL;

ALTER TABLE "Question"
  ALTER COLUMN "updated_at" SET NOT NULL;

ALTER TABLE "QuizOption"
  ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "questionId" ORDER BY "id"
  ) - 1 AS new_position
  FROM "QuizOption"
)
UPDATE "QuizOption" AS quiz_option
SET "position" = ranked.new_position
FROM ranked
WHERE quiz_option."id" = ranked."id";

CREATE INDEX IF NOT EXISTS "Question_quizId_deleted_at_position_idx"
  ON "Question"("quizId", "deleted_at", "position");
CREATE INDEX IF NOT EXISTS "QuizOption_questionId_position_idx"
  ON "QuizOption"("questionId", "position");

-- Preserve legacy attempts as well as possible before the application starts
-- requiring immutable start snapshots.
UPDATE "Attempt" AS attempt
SET "questionSnapshot" = snapshots.questions
FROM (
  SELECT
    attempt_rows."id" AS attempt_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'questionId', question."id",
          'text', question."text",
          'type', question."type",
          'points', question."points",
          'position', question."position",
          'options', COALESCE(options.items, '[]'::jsonb)
        )
        ORDER BY question."position", question."id"
      ) FILTER (WHERE question."id" IS NOT NULL),
      '[]'::jsonb
    ) AS questions
  FROM "Attempt" AS attempt_rows
  LEFT JOIN "Question" AS question
    ON question."quizId" = attempt_rows."quizId"
   AND question."deleted_at" IS NULL
   AND question."is_hidden" = false
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', option_row."id",
        'option', option_row."option",
        'isCorrect', option_row."isCorrect",
        'position', option_row."position"
      )
      ORDER BY option_row."position", option_row."id"
    ) AS items
    FROM "QuizOption" AS option_row
    WHERE option_row."questionId" = question."id"
  ) AS options ON true
  WHERE attempt_rows."questionSnapshot" IS NULL
  GROUP BY attempt_rows."id"
) AS snapshots
WHERE attempt."id" = snapshots.attempt_id
  AND attempt."questionSnapshot" IS NULL;
