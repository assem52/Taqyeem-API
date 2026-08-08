-- Quiz.instructions exists in Prisma but was never migrated.
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "instructions" TEXT;
