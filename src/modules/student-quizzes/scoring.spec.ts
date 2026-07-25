import { computeScore, QuestionSnapshotItem, AttemptAnswers } from './scoring';

describe('computeScore', () => {
  const mcq: QuestionSnapshotItem = {
    questionId: 'q1',
    text: 'What is 2 + 2?',
    type: 'MCQ',
    points: 2,
    options: [
      { id: 'opt-a', option: '3', isCorrect: false },
      { id: 'opt-b', option: '4', isCorrect: true },
    ],
  };

  const trueFalse: QuestionSnapshotItem = {
    questionId: 'q2',
    text: 'The sky is blue.',
    type: 'TRUE_FALSE',
    points: 1,
    options: [
      { id: 'opt-c', option: 'True', isCorrect: true },
      { id: 'opt-d', option: 'False', isCorrect: false },
    ],
  };

  const openEnded: QuestionSnapshotItem = {
    questionId: 'q3',
    text: 'Explain your reasoning.',
    type: 'OPEN_ENDED',
    points: 3,
    options: [],
  };

  const snapshot = [mcq, trueFalse, openEnded];

  it('awards points when the selected option is isCorrect', () => {
    const answers: AttemptAnswers = {
      q1: { selectedOptionId: 'opt-b', answeredAt: '2026-07-23T00:00:00.000Z' },
      q2: { selectedOptionId: 'opt-c', answeredAt: '2026-07-23T00:00:00.000Z' },
    };
    const score = computeScore(snapshot, answers, { passScorePercentage: 50 });
    expect(score.rawScore).toBe(3); // 2 (mcq) + 1 (true/false)
    expect(score.maxScore).toBe(3); // open-ended's 3 points excluded
    expect(score.percentage).toBe(100);
    expect(score.passed).toBe(true);
    expect(score.ungradedCount).toBe(1);
  });

  it('does not award points for a wrong option', () => {
    const answers: AttemptAnswers = {
      q1: { selectedOptionId: 'opt-a', answeredAt: '2026-07-23T00:00:00.000Z' },
    };
    const score = computeScore(snapshot, answers, {});
    expect(score.rawScore).toBe(0);
  });

  it('treats an unanswered question as wrong, not an error', () => {
    const score = computeScore(snapshot, {}, { passScorePercentage: 50 });
    expect(score.rawScore).toBe(0);
    expect(score.maxScore).toBe(3);
    expect(score.passed).toBe(false);
  });

  it('excludes OPEN_ENDED from maxScore and reports it via ungradedCount', () => {
    const score = computeScore([openEnded], {}, {});
    expect(score.maxScore).toBe(0);
    expect(score.percentage).toBe(0);
    expect(score.ungradedCount).toBe(1);
  });

  it('leaves passed as null when no passScore is configured', () => {
    const score = computeScore(snapshot, {}, {});
    expect(score.passed).toBeNull();
  });

  it('a selectedOptionId that matches no option in the snapshot scores as wrong, not an error', () => {
    const answers: AttemptAnswers = {
      q1: { selectedOptionId: 'not-a-real-option-id', answeredAt: '2026-07-23T00:00:00.000Z' },
    };
    const score = computeScore(snapshot, answers, {});
    expect(score.rawScore).toBe(0);
  });
});
