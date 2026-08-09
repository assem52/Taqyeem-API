-- Phase 1: results policy, open-ended text answers, question explanations

CREATE TYPE "ResultsPolicy" AS ENUM ('IMMEDIATE', 'AFTER_CLOSE', 'ADMIN_ONLY');

ALTER TABLE "Quiz"
  ADD COLUMN "results_policy" "ResultsPolicy" NOT NULL DEFAULT 'AFTER_CLOSE';

ALTER TABLE "Question"
  ADD COLUMN "explanation" TEXT;

ALTER TABLE "Answer"
  ADD COLUMN "text_answer" TEXT;

CREATE INDEX "Attempt_status_started_at_idx" ON "Attempt"("status", "started_at");
