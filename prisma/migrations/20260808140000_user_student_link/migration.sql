-- Link auth User rows to quiz-domain Student rows.
-- Admins keep student_id NULL; students get a 1:1 optional link.

ALTER TABLE "users" ADD COLUMN "student_id" UUID;

CREATE UNIQUE INDEX "users_student_id_key" ON "users"("student_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_student_id_fkey"
FOREIGN KEY ("student_id") REFERENCES "Student"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
