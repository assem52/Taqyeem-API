export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'OPEN_ENDED';

export interface OptionSnapshotItem {
  id: string;
  option: string;
  isCorrect: boolean;
  position?: number;
}

export interface QuestionSnapshotItem {
  questionId: string;
  text: string;
  type: QuestionType;
  points: number;
  position?: number;
  explanation?: string | null;
  options: OptionSnapshotItem[];
}

export interface StoredAnswer {
  selectedOptionId: string | null;
  textAnswer?: string | null;
  awardedPoints?: number | null;
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
  /** Per-question essay awards; falls back to answers[q].awardedPoints */
  essayAwards?: Record<string, number | null | undefined>;
}

export function computeScore(
  questionSnapshot: QuestionSnapshotItem[],
  answers: AttemptAnswers,
  opts: ComputeScoreOptions = {},
): ScoreResult {
  const {
    passScorePercentage = null,
    submittedAt = new Date(),
    essayAwards = {},
  } = opts;

  let rawScore = 0;
  let maxScore = 0;
  let ungradedCount = 0;

  for (const q of questionSnapshot) {
    maxScore += q.points;

    if (q.type === 'OPEN_ENDED') {
      const fromMap = essayAwards[q.questionId];
      const fromAnswer = answers[q.questionId]?.awardedPoints;
      const award =
        fromMap !== undefined && fromMap !== null
          ? Number(fromMap)
          : fromAnswer !== undefined && fromAnswer !== null
            ? Number(fromAnswer)
            : null;

      if (award == null || !Number.isFinite(award)) {
        ungradedCount += 1;
        continue;
      }
      rawScore += Math.min(q.points, Math.max(0, award));
      continue;
    }

    const selectedOptionId = answers[q.questionId]?.selectedOptionId ?? null;
    if (selectedOptionId != null) {
      const chosen = q.options.find((o) => o.id === selectedOptionId);
      if (chosen?.isCorrect) {
        rawScore += q.points;
      }
    }
  }

  const percentage =
    maxScore > 0 ? Math.round((rawScore / maxScore) * 10000) / 100 : 0;
  const passed =
    passScorePercentage != null ? percentage >= passScorePercentage : null;

  return { rawScore, maxScore, percentage, passed, ungradedCount, submittedAt };
}
