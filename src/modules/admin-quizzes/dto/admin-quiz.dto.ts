export class AdminQuizOptionDto {
  optionId: string;
  option: string;
  isCorrect: boolean;
  position: number;
}

export class AdminQuizQuestionDto {
  questionId: string;
  text: string;
  explanation: string | null;
  type: string;
  points: number;
  isHidden: boolean;
  position: number;
  options: AdminQuizOptionDto[];
}

/** GET /admin/quizzes/:id — screen-load preview (includes validationErrors). */
export class AdminQuizDto {
  quizId: string;
  title: string;
  description: string | null;
  instructions: string | null;
  status: string;
  openDate: string;
  closesAt: string;
  duration: number;
  passScore: number | null;
  integrityThreshold: number;
  resultsPolicy: string;
  hasAttempts: boolean;
  attemptCount: number;
  canEditStructure: boolean;
  isValid: boolean;
  validationErrors: string[];
  questions: AdminQuizQuestionDto[];
}

/** PATCH /admin/quizzes/:id/publish — success body. */
export class PublishQuizResponseDto {
  quizId: string;
  status: string;
  message: string;
}
