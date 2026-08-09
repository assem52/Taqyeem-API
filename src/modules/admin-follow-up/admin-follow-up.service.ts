import { Inject, Injectable } from '@nestjs/common';
import { QuizStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { INTEGRITY_FLAG_READER } from './adapters/integrity-flag.reader';
import type { IntegrityFlagReader } from './adapters/integrity-flag.reader';
import { classifyLearnerFollowUp } from './classify-learner-follow-up';
import {
  FOLLOW_UP_GROUP_ORDER,
  FOLLOW_UP_LABELS,
  FOLLOW_UP_NEXT_STEPS,
  FollowUpReason,
} from './classify-learner-follow-up.types';
import {
  FollowUpLearnerDto,
  FollowUpListDto,
} from './dto/follow-up-list.dto';

@Injectable()
export class AdminFollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(INTEGRITY_FLAG_READER)
    private readonly integrityFlagReader: IntegrityFlagReader,
  ) {}

  async getFollowUpList(quizId?: string): Promise<FollowUpListDto> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        quiz: {
          status: QuizStatus.PUBLISHED,
          ...(quizId ? { id: quizId } : {}),
        },
      },
      include: { student: true, quiz: true },
    });

    const byReason = this.emptyReasonCounts();

    if (enrollments.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        summary: { total: 0, byReason },
        groups: [],
      };
    }

    const attempts = await this.prisma.attempt.findMany({
      where: {
        OR: enrollments.map((enrollment) => ({
          studentId: enrollment.studentId,
          quizId: enrollment.quizId,
        })),
      },
      select: {
        id: true,
        studentId: true,
        quizId: true,
        status: true,
        score: true,
        submittedAt: true,
      },
    });

    const attemptByStudentAndQuiz = new Map(
      attempts.map((attempt) => [
        this.pairKey(attempt.studentId, attempt.quizId),
        attempt,
      ]),
    );
    const learnersByReason = new Map<FollowUpReason, FollowUpLearnerDto[]>(
      FOLLOW_UP_GROUP_ORDER.map((reason) => [reason, []]),
    );

    for (const enrollment of enrollments) {
      const { student, quiz } = enrollment;
      const attempt =
        attemptByStudentAndQuiz.get(this.pairKey(student.id, quiz.id)) ?? null;
      const integrityFlag = this.integrityFlagReader.getFlag(
        student.id,
        quiz.id,
      );
      const score = attempt?.score == null ? null : Number(attempt.score);
      const reason = classifyLearnerFollowUp({
        attempt: attempt
          ? {
              status: attempt.status,
              score,
            }
          : null,
        quiz: {
          passScore:
            quiz.passScore == null ? null : Number(quiz.passScore),
        },
        integrityFlag,
      });

      if (reason === null) {
        continue;
      }

      const learner: FollowUpLearnerDto = {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        quizId: quiz.id,
        quizTitle: quiz.title,
        attemptId: attempt?.id ?? null,
        score,
        submittedAt: attempt?.submittedAt?.toISOString() ?? null,
        attemptStatus: attempt?.status ?? null,
        nextStep: FOLLOW_UP_NEXT_STEPS[reason],
        ...(integrityFlag?.reviewNote
          ? { integrityReviewNote: integrityFlag.reviewNote }
          : {}),
      };

      learnersByReason.get(reason)?.push(learner);
      byReason[reason] += 1;
    }

    const groups = FOLLOW_UP_GROUP_ORDER.flatMap((reason) => {
      const learners = learnersByReason.get(reason) ?? [];
      learners.sort(
        (left, right) =>
          left.studentName.localeCompare(right.studentName) ||
          left.quizTitle.localeCompare(right.quizTitle),
      );

      return learners.length === 0
        ? []
        : [
            {
              reason,
              label: FOLLOW_UP_LABELS[reason],
              count: learners.length,
              learners,
            },
          ];
    });

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: groups.reduce((total, group) => total + group.count, 0),
        byReason,
      },
      groups,
    };
  }

  private pairKey(studentId: string, quizId: string): string {
    return `${studentId}:${quizId}`;
  }

  private emptyReasonCounts(): Record<FollowUpReason, number> {
    return {
      [FollowUpReason.DID_NOT_START]: 0,
      [FollowUpReason.STARTED_NOT_SUBMITTED]: 0,
      [FollowUpReason.FAILED]: 0,
      [FollowUpReason.FLAGGED_FOR_REVIEW]: 0,
      [FollowUpReason.LOW_SCORE]: 0,
    };
  }
}
