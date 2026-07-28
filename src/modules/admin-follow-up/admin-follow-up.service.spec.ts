import { AttemptStatus, QuizStatus } from '@prisma/client';
import { AdminFollowUpService } from './admin-follow-up.service';
import { IntegrityFlagReader } from './adapters/integrity-flag.reader';
import { FollowUpReason } from './classify-learner-follow-up.types';

const quizId = '66666666-6666-6666-6666-666666666666';

function enrollment(
  studentId: string,
  studentName: string,
  passScore: number | null = 50,
) {
  return {
    studentId,
    quizId,
    student: {
      id: studentId,
      name: studentName,
      email: `${studentName.toLowerCase().replaceAll(' ', '.')}@example.com`,
    },
    quiz: {
      id: quizId,
      title: 'Follow-Up Demo Quiz',
      passScore,
    },
  };
}

function createService() {
  const prisma = {
    enrollment: { findMany: jest.fn() },
    attempt: { findMany: jest.fn() },
  };
  const integrityFlagReader: IntegrityFlagReader = {
    getFlag: jest.fn(() => null),
  };

  return {
    service: new AdminFollowUpService(
      prisma as never,
      integrityFlagReader,
    ),
    prisma,
    integrityFlagReader,
  };
}

describe('AdminFollowUpService', () => {
  it('loads, classifies, groups, and excludes learners needing no follow-up', async () => {
    const { service, prisma, integrityFlagReader } = createService();
    const aliceId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const bobId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const carolId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const danId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    const eveId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const frankId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

    prisma.enrollment.findMany.mockResolvedValue([
      enrollment(aliceId, 'Alice'),
      enrollment(bobId, 'Bob'),
      enrollment(carolId, 'Carol'),
      enrollment(danId, 'Dan'),
      enrollment(eveId, 'Eve'),
      enrollment(frankId, 'Frank'),
    ]);
    prisma.attempt.findMany.mockResolvedValue([
      {
        studentId: bobId,
        quizId,
        status: AttemptStatus.IN_PROGRESS,
        score: null,
        submittedAt: null,
      },
      {
        studentId: carolId,
        quizId,
        status: AttemptStatus.SUBMITTED,
        score: 0,
        submittedAt: new Date('2026-07-27T10:00:00.000Z'),
      },
      {
        studentId: danId,
        quizId,
        status: AttemptStatus.SUBMITTED,
        score: 55,
        submittedAt: new Date('2026-07-27T10:01:00.000Z'),
      },
      {
        studentId: eveId,
        quizId,
        status: AttemptStatus.SUBMITTED,
        score: 80,
        submittedAt: new Date('2026-07-27T10:02:00.000Z'),
      },
      {
        studentId: frankId,
        quizId,
        status: AttemptStatus.SUBMITTED,
        score: 85,
        submittedAt: new Date('2026-07-27T10:03:00.000Z'),
      },
    ]);
    jest
      .spyOn(integrityFlagReader, 'getFlag')
      .mockImplementation((studentId) =>
        studentId === eveId
          ? { isActive: true, reviewNote: 'Review required' }
          : null,
      );

    const result = await service.getFollowUpList(quizId);

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: {
        quiz: {
          status: QuizStatus.PUBLISHED,
          id: quizId,
        },
      },
      include: { student: true, quiz: true },
    });
    expect(result.summary.total).toBe(5);
    expect(result.summary.byReason).toEqual({
      [FollowUpReason.DID_NOT_START]: 1,
      [FollowUpReason.STARTED_NOT_SUBMITTED]: 1,
      [FollowUpReason.FAILED]: 1,
      [FollowUpReason.FLAGGED_FOR_REVIEW]: 1,
      [FollowUpReason.LOW_SCORE]: 1,
    });
    expect(result.groups.map((group) => group.reason)).toEqual([
      FollowUpReason.FLAGGED_FOR_REVIEW,
      FollowUpReason.STARTED_NOT_SUBMITTED,
      FollowUpReason.DID_NOT_START,
      FollowUpReason.FAILED,
      FollowUpReason.LOW_SCORE,
    ]);

    const didNotStart = result.groups.find(
      (group) => group.reason === FollowUpReason.DID_NOT_START,
    );
    const failed = result.groups.find(
      (group) => group.reason === FollowUpReason.FAILED,
    );
    const flagged = result.groups.find(
      (group) => group.reason === FollowUpReason.FLAGGED_FOR_REVIEW,
    );

    expect(didNotStart?.learners[0].score).toBeNull();
    expect(failed?.learners[0].score).toBe(0);
    expect(flagged?.learners[0].integrityReviewNote).toBe('Review required');
    expect(
      result.groups.flatMap((group) =>
        group.learners.map((learner) => learner.studentName),
      ),
    ).not.toContain('Frank');
  });

  it('queries every published quiz when quizId is omitted', async () => {
    const { service, prisma } = createService();
    prisma.enrollment.findMany.mockResolvedValue([]);

    const result = await service.getFollowUpList();

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith({
      where: { quiz: { status: QuizStatus.PUBLISHED } },
      include: { student: true, quiz: true },
    });
    expect(prisma.attempt.findMany).not.toHaveBeenCalled();
    expect(result.summary.total).toBe(0);
    expect(result.groups).toEqual([]);
  });
});
