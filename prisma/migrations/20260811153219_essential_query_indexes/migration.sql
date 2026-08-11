-- CreateIndex
CREATE INDEX "Answer_grading_status_idx" ON "Answer"("grading_status");

-- CreateIndex
CREATE INDEX "Attempt_status_submitted_at_idx" ON "Attempt"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "Attempt_quizId_status_idx" ON "Attempt"("quizId", "status");

-- CreateIndex
CREATE INDEX "Attempt_studentId_idx" ON "Attempt"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Quiz_status_created_at_idx" ON "Quiz"("status", "created_at");

-- CreateIndex
CREATE INDEX "users_verification_token_idx" ON "users"("verification_token");

-- CreateIndex
CREATE INDEX "users_password_reset_token_idx" ON "users"("password_reset_token");
