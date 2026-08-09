import { IsOptional, Matches } from 'class-validator';
import { AttemptStatus } from '@prisma/client';
import { FollowUpReason } from '../classify-learner-follow-up.types';

export class FollowUpListQueryDto {
  @IsOptional()
  @Matches(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    { message: 'quizId must be a UUID' },
  )
  quizId?: string;
}

export class FollowUpLearnerDto {
  studentId: string;
  studentName: string;
  studentEmail: string;
  quizId: string;
  quizTitle: string;
  attemptId: string | null;
  score: number | null;
  submittedAt: string | null;
  attemptStatus: AttemptStatus | null;
  nextStep: string;
  integrityReviewNote?: string;
}

export class FollowUpGroupDto {
  reason: FollowUpReason;
  label: string;
  count: number;
  learners: FollowUpLearnerDto[];
}

export class FollowUpListDto {
  generatedAt: string;
  summary: {
    total: number;
    byReason: Record<FollowUpReason, number>;
  };
  groups: FollowUpGroupDto[];
}
