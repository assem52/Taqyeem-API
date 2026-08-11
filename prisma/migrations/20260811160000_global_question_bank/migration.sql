-- Persistent org-wide question bank (categories + bank questions).
-- Quiz-scoped Question / QuizOption tables are unchanged; bank items are copied into quizzes.

CREATE TABLE "question_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_categories_name_key" ON "question_categories"("name");
CREATE UNIQUE INDEX "question_categories_slug_key" ON "question_categories"("slug");

CREATE TABLE "bank_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "explanation" TEXT,
    "type" "QuestionType" NOT NULL DEFAULT 'MCQ',
    "points" DECIMAL(7,2) NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_questions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_questions_category_id_deleted_at_idx" ON "bank_questions"("category_id", "deleted_at");
CREATE INDEX "bank_questions_deleted_at_created_at_idx" ON "bank_questions"("deleted_at", "created_at");

CREATE TABLE "bank_question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "option" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_question_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_question_options_question_id_position_idx" ON "bank_question_options"("question_id", "position");

ALTER TABLE "bank_questions"
  ADD CONSTRAINT "bank_questions_category_id_fkey"
  FOREIGN KEY ("category_id") REFERENCES "question_categories"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_question_options"
  ADD CONSTRAINT "bank_question_options_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "bank_questions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
