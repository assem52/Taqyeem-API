import { AttemptStatus } from '@prisma/client';
import {
  ClassifyLearnerFollowUpInput,
  FollowUpReason,
  LOW_SCORE_THRESHOLD,
} from './classify-learner-follow-up.types';

function isTerminalAttempt(status: AttemptStatus): boolean {
  return (
    status === AttemptStatus.SUBMITTED ||
    status === AttemptStatus.AUTO_SUBMITTED
  );
}

/**
 * Classify one (student, quiz) pair into a single follow-up reason.
 * Returns null when the learner needs no follow-up action.
 *
 * @see backend/docs/week-3/student-classification-for-followup.md
 */
export function classifyLearnerFollowUp(
  input: ClassifyLearnerFollowUpInput,
): FollowUpReason | null {
  const { attempt, quiz, integrityFlag } = input;

  if (integrityFlag?.isActive === true) {
    return FollowUpReason.FLAGGED_FOR_REVIEW;
  }

  if (attempt?.status === AttemptStatus.IN_PROGRESS) {
    return FollowUpReason.STARTED_NOT_SUBMITTED;
  }

  if (!attempt) {
    return FollowUpReason.DID_NOT_START;
  }

  if (!isTerminalAttempt(attempt.status)) {
    return null;
  }

  const score = attempt.score;
  if (score == null) {
    return null;
  }

  if (quiz.passScore != null && score < quiz.passScore) {
    return FollowUpReason.FAILED;
  }

  if (score < LOW_SCORE_THRESHOLD) {
    return FollowUpReason.LOW_SCORE;
  }

  return null;
}
