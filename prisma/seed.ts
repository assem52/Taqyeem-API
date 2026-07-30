import {
  AttemptStatus,
  IntegrityEventType,
  PrismaClient,
  QuestionType,
  QuizStatus,
  StudentStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

const VERIFIED_STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const PUBLISHABLE_DRAFT_ID = '22222222-2222-2222-2222-222222222222';
const INVALID_DRAFT_ID = '33333333-3333-3333-3333-333333333333';
const EMPTY_DRAFT_ID = '44444444-4444-4444-4444-444444444444';
const IN_PROGRESS_QUIZ_ID = '55555555-5555-5555-5555-555555555555';

// Week 3 — admin follow-up demo (see backend/docs/week-3/student-classification-for-followup.md)
const FOLLOW_UP_DEMO_QUIZ_ID = '66666666-6666-6666-6666-666666666666';
const DID_NOT_START_ALICE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const IN_PROGRESS_BOB_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const FAILED_CAROL_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LOW_SCORE_DAN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const FLAGGED_EVE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PASSED_FRANK_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
 
async function main() {
  await prisma.attempt.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.student.deleteMany();

  const student = await prisma.student.create({
    data: {
      id: VERIFIED_STUDENT_ID,
      name: 'Assem Test',
      email: 'assem.test@example.com',
      status: StudentStatus.VERIFIED,
    },
  });

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const notStartedQuiz = await prisma.quiz.create({
    data: {
      title: 'Not Started Quiz',
      description: 'Opens and closes in the future',
      status: QuizStatus.PUBLISHED,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  const inProgressQuiz = await prisma.quiz.create({
    data: {
      id: IN_PROGRESS_QUIZ_ID,
      title: 'In Progress Quiz',
      description: 'Student has an active attempt',
      status: QuizStatus.PUBLISHED,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  const submittedQuiz = await prisma.quiz.create({
    data: {
      title: 'Submitted Quiz',
      description: 'Student already submitted',
      status: QuizStatus.PUBLISHED,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  const closedQuiz = await prisma.quiz.create({
    data: {
      title: 'Closed Quiz',
      description: 'Window has passed',
      status: QuizStatus.PUBLISHED,
      openDate: dayAgo,
      closesAt: dayAgo,
      duration: 60,
    },
  });

  const draftQuiz = await prisma.quiz.create({
    data: {
      title: 'Draft Quiz',
      description: 'Should never appear on dashboard',
      status: QuizStatus.DRAFT,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  const publishableDraft = await prisma.quiz.create({
    data: {
      id: PUBLISHABLE_DRAFT_ID,
      title: 'Publishable Draft Quiz',
      description: 'Valid draft for publish demo',
      status: QuizStatus.DRAFT,
      openDate: now,
      closesAt: weekFromNow,
      duration: 45,
      passScore: 70,
    },
  });

  const invalidDraft = await prisma.quiz.create({
    data: {
      id: INVALID_DRAFT_ID,
      title: 'Invalid Draft Quiz',
      description: 'Missing correct answer',
      status: QuizStatus.DRAFT,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  const emptyDraft = await prisma.quiz.create({
    data: {
      id: EMPTY_DRAFT_ID,
      title: 'Empty Draft Quiz',
      description: 'No questions',
      status: QuizStatus.DRAFT,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
    },
  });

  for (const quiz of [
    notStartedQuiz,
    inProgressQuiz,
    submittedQuiz,
    closedQuiz,
    draftQuiz,
    publishableDraft,
    invalidDraft,
    emptyDraft,
  ]) {
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        quizId: quiz.id,
      },
    });
  }

  await prisma.question.create({
    data: {
      quizId: publishableDraft.id,
      text: 'What is 2+2?',
      type: QuestionType.MCQ,
      points: 1,
      options: {
        create: [
          { option: '3', isCorrect: false },
          { option: '4', isCorrect: true },
        ],
      },
    },
  });

  await prisma.question.create({
    data: {
      quizId: invalidDraft.id,
      text: 'Ungraded question',
      type: QuestionType.MCQ,
      points: 1,
      options: {
        create: [
          { option: 'A', isCorrect: false },
          { option: 'B', isCorrect: false },
        ],
      },
    },
  });

  await prisma.attempt.create({
    data: {
      studentId: student.id,
      quizId: inProgressQuiz.id,
      status: AttemptStatus.IN_PROGRESS,
    },
  });

  await prisma.attempt.create({
    data: {
      studentId: student.id,
      quizId: submittedQuiz.id,
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: 85,
    },
  });

  // --- Week 3 follow-up demo ---
  const followUpStudents = await Promise.all([
    prisma.student.create({
      data: {
        id: DID_NOT_START_ALICE_ID,
        name: 'Did Not Start Alice',
        email: 'alice.didnotstart@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
    prisma.student.create({
      data: {
        id: IN_PROGRESS_BOB_ID,
        name: 'In Progress Bob',
        email: 'bob.inprogress@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
    prisma.student.create({
      data: {
        id: FAILED_CAROL_ID,
        name: 'Failed Carol',
        email: 'carol.failed@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
    prisma.student.create({
      data: {
        id: LOW_SCORE_DAN_ID,
        name: 'Low Score Dan',
        email: 'dan.lowscore@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
    prisma.student.create({
      data: {
        id: FLAGGED_EVE_ID,
        name: 'Flagged Eve',
        email: 'eve.flagged@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
    prisma.student.create({
      data: {
        id: PASSED_FRANK_ID,
        name: 'Passed Frank',
        email: 'frank.passed@example.com',
        status: StudentStatus.VERIFIED,
      },
    }),
  ]);

  const followUpDemoQuiz = await prisma.quiz.create({
    data: {
      id: FOLLOW_UP_DEMO_QUIZ_ID,
      title: 'Follow-Up Demo Quiz',
      description: 'Week 3 admin follow-up classification demo',
      status: QuizStatus.PUBLISHED,
      openDate: now,
      closesAt: weekFromNow,
      duration: 60,
      passScore: 50,
      integrityThreshold: 5,
    },
  });

  await prisma.question.create({
    data: {
      quizId: followUpDemoQuiz.id,
      text: 'What is 1+1?',
      type: QuestionType.MCQ,
      points: 1,
      options: {
        create: [
          { option: '1', isCorrect: false },
          { option: '2', isCorrect: true },
        ],
      },
    },
  });

  for (const s of followUpStudents) {
    await prisma.enrollment.create({
      data: { studentId: s.id, quizId: followUpDemoQuiz.id },
    });
  }

  await prisma.attempt.create({
    data: {
      studentId: IN_PROGRESS_BOB_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.IN_PROGRESS,
    },
  });

  await prisma.attempt.create({
    data: {
      studentId: FAILED_CAROL_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: 40,
    },
  });

  await prisma.attempt.create({
    data: {
      studentId: LOW_SCORE_DAN_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: 55,
    },
  });

  const eveAttempt = await prisma.attempt.create({
    data: {
      studentId: FLAGGED_EVE_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: 80,
    },
  });

  // Seed 6 real IntegrityEvent rows for Eve, spaced 3s apart so each one
  // falls outside the 2-second de-dupe window and actually inserts.
  // eventCount (6) > quiz.integrityThreshold (5) => isAttemptFlagged === true
  for (let i = 0; i < 6; i++) {
    await prisma.integrityEvent.create({
      data: {
        attemptId: eveAttempt.id,
        type: IntegrityEventType.VISIBILITY_LOST,
        occurredAt: new Date(now.getTime() + i * 3000),
      },
    });
  }

  await prisma.attempt.create({
    data: {
      studentId: PASSED_FRANK_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      score: 85,
    },
  });

  // Alice: no attempt → DID_NOT_START

  console.log('Seed complete.');
  console.log(`MOCK_STUDENT_ID=${student.id}`);
  console.log(`PUBLISHABLE_DRAFT_QUIZ_ID=${publishableDraft.id}`);
  console.log(`INVALID_DRAFT_QUIZ_ID=${invalidDraft.id}`);
  console.log(`EMPTY_DRAFT_QUIZ_ID=${emptyDraft.id}`);
  console.log(`IN_PROGRESS_QUIZ_ID=${inProgressQuiz.id}`);
  console.log(`FOLLOW_UP_DEMO_QUIZ_ID=${followUpDemoQuiz.id}`);
  console.log('Follow-up demo expected: 1 did-not-start, 1 in-progress, 1 failed, 1 low-score, 1 flagged (6 integrity events, threshold 5), 1 excluded');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
