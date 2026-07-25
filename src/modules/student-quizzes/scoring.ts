export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'OPEN_ENDED';

export interface OptionSnapshotItem {
  id: string;
  option: string;
  isCorrect: boolean;
}

export interface QuestionSnapshotItem {
  questionId: string;
  text: string;
  type: QuestionType;
  points: number;
  options: OptionSnapshotItem[];
}

export interface StoredAnswer {
  selectedOptionId: string | null;
  answeredAt: string;
}
export type AttemptAnswers = Record<string, StoredAnswer | undefined>;

export interface ScoreResult {
  rawScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean | null;
  ungradedCount: number;
  submittedAt: Date;
}

export interface ComputeScoreOptions {

  passScorePercentage?: number | null;
  submittedAt?: Date;
}


export function computeScore(
  questionSnapshot: QuestionSnapshotItem[],
  answers: AttemptAnswers,
  opts: ComputeScoreOptions = {},
): ScoreResult {
  const { passScorePercentage = null, submittedAt = new Date() } = opts;

  let rawScore = 0;
  let maxScore = 0;
  let ungradedCount = 0;

  for (const q of questionSnapshot) {
    if (q.type === 'OPEN_ENDED') {
      ungradedCount += 1;
      continue;
    }

    maxScore += q.points;
    const selectedOptionId = answers[q.questionId]?.selectedOptionId ?? null;
    if (selectedOptionId != null) {
      const chosen = q.options.find(o => o.id === selectedOptionId);
      if (chosen?.isCorrect) {
        rawScore += q.points;
      }
    }
  }

  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 10000) / 100 : 0;
  const passed = passScorePercentage != null ? percentage >= passScorePercentage : null;

  return { rawScore, maxScore, percentage, passed, ungradedCount, submittedAt };
}
