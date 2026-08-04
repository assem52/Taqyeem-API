-- CreateEnum
CREATE TYPE "IntegrityEventType" AS ENUM ('VISIBILITY_LOST');

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN "integrity_threshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "IntegrityEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "attemptId" UUID NOT NULL,
    "type" "IntegrityEventType" NOT NULL DEFAULT 'VISIBILITY_LOST',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrityEvent_attemptId_idx" ON "IntegrityEvent"("attemptId");

-- AddForeignKey
ALTER TABLE "IntegrityEvent" ADD CONSTRAINT "IntegrityEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
