import { AttemptStatus } from '@prisma/client';

export enum FollowUpReason {
  DID_NOT_START = 'DID_NOT_START',
  STARTED_NOT_SUBMITTED = 'STARTED_NOT_SUBMITTED',
  FAILED = 'FAILED',
  FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
  LOW_SCORE = 'LOW_SCORE',
}

/** Percentage points; coaching threshold when not failed. */
export const LOW_SCORE_THRESHOLD = 60;

export interface ClassifyLearnerFollowUpInput {
  attempt: {
    status: AttemptStatus;
    score: number | null;
  } | null;
  quiz: {
    passScore: number | null;
  };
  integrityFlag: {
    isActive: boolean;
    reviewNote?: string;
  } | null;
}

export const FOLLOW_UP_NEXT_STEPS: Record<FollowUpReason, string> = {
  [FollowUpReason.DID_NOT_START]: 'Send invitation reminder',
  [FollowUpReason.STARTED_NOT_SUBMITTED]:
    'Contact learner to complete submission',
  [FollowUpReason.FAILED]: 'Review result and discuss retake options',
  [FollowUpReason.LOW_SCORE]: 'Schedule coaching session',
  [FollowUpReason.FLAGGED_FOR_REVIEW]:
    'Review attempt details for administrative follow-up',
};

export const FOLLOW_UP_GROUP_ORDER: FollowUpReason[] = [
  FollowUpReason.FLAGGED_FOR_REVIEW,
  FollowUpReason.STARTED_NOT_SUBMITTED,
  FollowUpReason.DID_NOT_START,
  FollowUpReason.FAILED,
  FollowUpReason.LOW_SCORE,
];
