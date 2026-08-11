import {
  AttemptStatus,
  IntegrityEventType,
  PrismaClient,
  QuestionType,
  QuizStatus,
  ResultsPolicy,
  Role,
  StudentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Increment when demo seed scenarios change so test/demo runs can identify the exact fixture version.
const SEED_VERSION = '2026.08.11-question-bank-v1';
const DEMO_STUDENT_EMAIL = 'assem.test@example.com';
const DEMO_STUDENT_PASSWORD = 'Student123!';
const DEMO_ADMIN_EMAIL = 'admin@example.com';
const DEMO_ADMIN_PASSWORD = 'Admin123!';

const VERIFIED_STUDENT_ID = '11111111-1111-1111-1111-111111111111';
const PUBLISHABLE_DRAFT_ID = '22222222-2222-2222-2222-222222222222';
const INVALID_DRAFT_ID = '33333333-3333-3333-3333-333333333333';
const EMPTY_DRAFT_ID = '44444444-4444-4444-4444-444444444444';
const IN_PROGRESS_QUIZ_ID = '55555555-5555-5555-5555-555555555555';
const CLOSED_RESULTS_QUIZ_ID = '77777777-7777-7777-7777-777777777777';

// Week 3 — admin follow-up demo (see backend/docs/week-3/student-classification-for-followup.md)
const FOLLOW_UP_DEMO_QUIZ_ID = '66666666-6666-6666-6666-666666666666';
const DID_NOT_START_ALICE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const IN_PROGRESS_BOB_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const FAILED_CAROL_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LOW_SCORE_DAN_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const FLAGGED_EVE_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const PASSED_FRANK_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

async function main() {
  await prisma.answer.deleteMany();
  await prisma.integrityEvent.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.quizOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.bankQuestionOption.deleteMany();
  await prisma.bankQuestion.deleteMany();
  await prisma.questionCategory.deleteMany();
  // Users may FK to Student — clear auth rows before deleting students.
  await prisma.user.deleteMany();
  await prisma.student.deleteMany();

  await seedQuestionBank();

  const student = await prisma.student.create({
    data: {
      id: VERIFIED_STUDENT_ID,
      name: 'Assem Test',
      email: DEMO_STUDENT_EMAIL,
      status: StudentStatus.VERIFIED,
    },
  });

  // Linked auth accounts so login works without mock headers.
  const studentPasswordHash = await bcrypt.hash(DEMO_STUDENT_PASSWORD, 10);
  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      name: 'Assem Test',
      email: DEMO_STUDENT_EMAIL,
      password: studentPasswordHash,
      role: Role.STUDENT,
      status: StudentStatus.VERIFIED,
      studentId: student.id,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Demo Admin',
      email: DEMO_ADMIN_EMAIL,
      password: adminPasswordHash,
      role: Role.ADMIN,
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
      id: CLOSED_RESULTS_QUIZ_ID,
      title: 'Closed Quiz — Results Ready',
      description: 'Window closed; learner can review score and explanations',
      status: QuizStatus.PUBLISHED,
      openDate: dayAgo,
      closesAt: dayAgo,
      duration: 60,
      passScore: 70,
      resultsPolicy: ResultsPolicy.AFTER_CLOSE,
      instructions: 'Demo closed exam. Results unlock after the window closes.',
      integrityThreshold: 5,
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
      position: 0,
      options: {
        create: [
          { option: '3', isCorrect: false, position: 0 },
          { option: '4', isCorrect: true, position: 1 },
        ],
      },
    },
  });

  await prisma.question.create({
    data: {
      quizId: publishableDraft.id,
      text: 'PostgreSQL is a relational database.',
      type: QuestionType.TRUE_FALSE,
      points: 1,
      position: 1,
      options: {
        create: [
          { option: 'True', isCorrect: true, position: 0 },
          { option: 'False', isCorrect: false, position: 1 },
        ],
      },
    },
  });

  // Hidden malformed data demonstrates that drafts can retain work-in-progress
  // questions without allowing them into publishing or student snapshots.
  await prisma.question.create({
    data: {
      quizId: publishableDraft.id,
      text: 'Work in progress',
      type: QuestionType.MCQ,
      isHidden: true,
      position: 2,
      options: {
        create: [
          { option: '', isCorrect: false, position: 0 },
          { option: '', isCorrect: false, position: 1 },
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

  const inProgressQuestion = await prisma.question.create({
    data: {
      quizId: inProgressQuiz.id,
      text: 'In-progress demo: what is 3+1?',
      type: QuestionType.MCQ,
      points: 1,
      position: 0,
      options: {
        create: [
          { option: '3', isCorrect: false, position: 0 },
          { option: '4', isCorrect: true, position: 1 },
        ],
      },
    },
    include: { options: { orderBy: { position: 'asc' } } },
  });

  await prisma.attempt.create({
    data: {
      studentId: student.id,
      quizId: inProgressQuiz.id,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: now,
      questionSnapshot: [
        {
          questionId: inProgressQuestion.id,
          text: inProgressQuestion.text,
          type: inProgressQuestion.type,
          points: inProgressQuestion.points.toNumber(),
          position: inProgressQuestion.position,
          options: inProgressQuestion.options.map((option) => ({
            id: option.id,
            option: option.option,
            isCorrect: option.isCorrect,
            position: option.position,
          })),
        },
      ],
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

  const closedQ1 = await prisma.question.create({
    data: {
      quizId: closedQuiz.id,
      text: 'Which HTTP status means success?',
      type: QuestionType.MCQ,
      points: 1,
      position: 0,
      explanation:
        '2xx responses indicate the request succeeded. 200 is the common success code.',
      options: {
        create: [
          { option: '404', isCorrect: false, position: 0 },
          { option: '200', isCorrect: true, position: 1 },
          { option: '500', isCorrect: false, position: 2 },
        ],
      },
    },
    include: { options: true },
  });

  const closedQ2 = await prisma.question.create({
    data: {
      quizId: closedQuiz.id,
      text: 'SQL SELECT retrieves rows from a table.',
      type: QuestionType.TRUE_FALSE,
      points: 1,
      position: 1,
      explanation: 'SELECT is the read query in SQL.',
      options: {
        create: [
          { option: 'True', isCorrect: true, position: 0 },
          { option: 'False', isCorrect: false, position: 1 },
        ],
      },
    },
    include: { options: true },
  });

  const closedCorrect1 = closedQ1.options.find((o) => o.isCorrect)!;
  const closedWrong2 = closedQ2.options.find((o) => !o.isCorrect)!;

  const closedAttempt = await prisma.attempt.create({
    data: {
      studentId: student.id,
      quizId: closedQuiz.id,
      status: AttemptStatus.SUBMITTED,
      startedAt: dayAgo,
      submittedAt: dayAgo,
      score: 50,
    },
  });

  await prisma.answer.createMany({
    data: [
      {
        attemptId: closedAttempt.id,
        questionId: closedQ1.id,
        selectedOptionId: closedCorrect1.id,
      },
      {
        attemptId: closedAttempt.id,
        questionId: closedQ2.id,
        selectedOptionId: closedWrong2.id,
      },
    ],
  });

  await prisma.invitation.create({
    data: {
      quizId: closedQuiz.id,
      email: DEMO_STUDENT_EMAIL,
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
      resultsPolicy: ResultsPolicy.IMMEDIATE,
      instructions: 'Follow-up coaching demo quiz.',
    },
  });

  const followUpQuestion = await prisma.question.create({
    data: {
      quizId: followUpDemoQuiz.id,
      text: 'What is 1+1?',
      type: QuestionType.MCQ,
      points: 1,
      explanation: 'Basic arithmetic: 1 + 1 = 2.',
      options: {
        create: [
          { option: '1', isCorrect: false },
          { option: '2', isCorrect: true },
        ],
      },
    },
    include: { options: true },
  });

  for (const s of followUpStudents) {
    await prisma.enrollment.create({
      data: { studentId: s.id, quizId: followUpDemoQuiz.id },
    });
    await prisma.invitation.create({
      data: { quizId: followUpDemoQuiz.id, email: s.email },
    });
  }

  await prisma.attempt.create({
    data: {
      studentId: IN_PROGRESS_BOB_ID,
      quizId: followUpDemoQuiz.id,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: now,
      questionSnapshot: [
        {
          questionId: followUpQuestion.id,
          text: followUpQuestion.text,
          type: followUpQuestion.type,
          points: followUpQuestion.points.toNumber(),
          options: followUpQuestion.options.map((option) => ({
            id: option.id,
            option: option.option,
            isCorrect: option.isCorrect,
          })),
        },
      ],
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
  console.log(`SEED_VERSION=${SEED_VERSION}`);
  console.log(`MOCK_STUDENT_ID=${student.id}`);
  console.log(
    `DEMO_STUDENT_LOGIN=${DEMO_STUDENT_EMAIL} / ${DEMO_STUDENT_PASSWORD}`,
  );
  console.log(`DEMO_ADMIN_LOGIN=${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`PUBLISHABLE_DRAFT_QUIZ_ID=${publishableDraft.id}`);
  console.log(`INVALID_DRAFT_QUIZ_ID=${invalidDraft.id}`);
  console.log(`EMPTY_DRAFT_QUIZ_ID=${emptyDraft.id}`);
  console.log(`IN_PROGRESS_QUIZ_ID=${inProgressQuiz.id}`);
  console.log(`CLOSED_RESULTS_QUIZ_ID=${closedQuiz.id}`);
  console.log(`FOLLOW_UP_DEMO_QUIZ_ID=${followUpDemoQuiz.id}`);
  console.log(
    'Follow-up demo expected: 1 did-not-start, 1 in-progress, 1 failed, 1 low-score, 1 flagged (6 integrity events, threshold 5), 1 excluded',
  );
  console.log(
    'Closed-with-results: assem.test can open Closed Quiz — Results Ready for review + explanations.',
  );
  console.log(
    'Question bank: Math, Computer Science, Physics, General Information seeded.',
  );
}

type SeedBankOption = { option: string; isCorrect: boolean };

async function seedQuestionBank() {
  const categories = [
    { name: 'Math', slug: 'math' },
    { name: 'Computer Science', slug: 'computer-science' },
    { name: 'Physics', slug: 'physics' },
    { name: 'General Information', slug: 'general-information' },
  ] as const;

  const created = new Map<string, string>();
  for (const category of categories) {
    const row = await prisma.questionCategory.create({ data: category });
    created.set(category.slug, row.id);
  }

  const bankItems: Array<{
    categorySlug: string;
    text: string;
    type: QuestionType;
    explanation?: string;
    options: SeedBankOption[];
  }> = [
    {
      categorySlug: 'math',
      text: 'What is the value of π rounded to two decimal places?',
      type: QuestionType.MCQ,
      explanation: 'π ≈ 3.14159…, so two decimal places is 3.14.',
      options: [
        { option: '3.12', isCorrect: false },
        { option: '3.14', isCorrect: true },
        { option: '3.16', isCorrect: false },
        { option: '3.18', isCorrect: false },
      ],
    },
    {
      categorySlug: 'math',
      text: 'The derivative of x² with respect to x is 2x.',
      type: QuestionType.TRUE_FALSE,
      explanation: 'Power rule: d/dx[xⁿ] = n·xⁿ⁻¹.',
      options: [
        { option: 'True', isCorrect: true },
        { option: 'False', isCorrect: false },
      ],
    },
    {
      categorySlug: 'math',
      text: 'Solve for x: 2x + 6 = 14',
      type: QuestionType.MCQ,
      options: [
        { option: '2', isCorrect: false },
        { option: '4', isCorrect: true },
        { option: '6', isCorrect: false },
        { option: '8', isCorrect: false },
      ],
    },
    {
      categorySlug: 'computer-science',
      text: 'Which data structure follows FIFO (first in, first out)?',
      type: QuestionType.MCQ,
      explanation: 'Queues dequeue the oldest enqueued element.',
      options: [
        { option: 'Stack', isCorrect: false },
        { option: 'Queue', isCorrect: true },
        { option: 'Binary tree', isCorrect: false },
        { option: 'Hash set', isCorrect: false },
      ],
    },
    {
      categorySlug: 'computer-science',
      text: 'HTTP is a stateful protocol by default.',
      type: QuestionType.TRUE_FALSE,
      explanation: 'HTTP is stateless; each request is independent unless cookies/sessions are layered on.',
      options: [
        { option: 'True', isCorrect: false },
        { option: 'False', isCorrect: true },
      ],
    },
    {
      categorySlug: 'computer-science',
      text: 'What does Big-O notation describe?',
      type: QuestionType.MCQ,
      options: [
        { option: 'Exact runtime in milliseconds', isCorrect: false },
        { option: 'Algorithm growth rate as input size grows', isCorrect: true },
        { option: 'Memory address of a variable', isCorrect: false },
        { option: 'Number of CPU cores used', isCorrect: false },
      ],
    },
    {
      categorySlug: 'physics',
      text: 'What is the SI unit of force?',
      type: QuestionType.MCQ,
      explanation: 'Force is measured in newtons (N).',
      options: [
        { option: 'Joule', isCorrect: false },
        { option: 'Watt', isCorrect: false },
        { option: 'Newton', isCorrect: true },
        { option: 'Pascal', isCorrect: false },
      ],
    },
    {
      categorySlug: 'physics',
      text: 'Light travels faster in a vacuum than in glass.',
      type: QuestionType.TRUE_FALSE,
      explanation: 'The speed of light is highest in vacuum; materials slow it down.',
      options: [
        { option: 'True', isCorrect: true },
        { option: 'False', isCorrect: false },
      ],
    },
    {
      categorySlug: 'physics',
      text: 'Which quantity is conserved in an isolated system according to the first law of thermodynamics?',
      type: QuestionType.MCQ,
      options: [
        { option: 'Entropy alone', isCorrect: false },
        { option: 'Energy', isCorrect: true },
        { option: 'Temperature', isCorrect: false },
        { option: 'Volume', isCorrect: false },
      ],
    },
    {
      categorySlug: 'general-information',
      text: 'Which planet is known as the Red Planet?',
      type: QuestionType.MCQ,
      options: [
        { option: 'Venus', isCorrect: false },
        { option: 'Mars', isCorrect: true },
        { option: 'Jupiter', isCorrect: false },
        { option: 'Mercury', isCorrect: false },
      ],
    },
    {
      categorySlug: 'general-information',
      text: 'The United Nations headquarters is located in New York City.',
      type: QuestionType.TRUE_FALSE,
      options: [
        { option: 'True', isCorrect: true },
        { option: 'False', isCorrect: false },
      ],
    },
    {
      categorySlug: 'general-information',
      text: 'How many continents are there on Earth (standard school model)?',
      type: QuestionType.MCQ,
      options: [
        { option: '5', isCorrect: false },
        { option: '6', isCorrect: false },
        { option: '7', isCorrect: true },
        { option: '8', isCorrect: false },
      ],
    },
  ];

  for (const item of bankItems) {
    const categoryId = created.get(item.categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for slug ${item.categorySlug}`);
    }
    await prisma.bankQuestion.create({
      data: {
        categoryId,
        text: item.text,
        explanation: item.explanation ?? null,
        type: item.type,
        points: 1,
        options: {
          create: item.options.map((option, position) => ({
            option: option.option,
            isCorrect: option.isCorrect,
            position,
          })),
        },
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
