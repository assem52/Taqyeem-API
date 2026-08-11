-- CreateEnum
CREATE TYPE "AnswerGradingStatus" AS ENUM ('UNGRADED', 'AI_GRADED', 'HUMAN_REVIEWED');

-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "ai_feedback" TEXT,
ADD COLUMN     "awarded_points" DECIMAL(7,2),
ADD COLUMN     "grading_status" "AnswerGradingStatus";
