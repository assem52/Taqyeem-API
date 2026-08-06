export class QuestionOptionDto {
  id: string;
  option: string;
}

export class QuestionItemDto {
  id: string;
  text: string;
  type: string;
  options: QuestionOptionDto[];
}

export class StudentAttemptDto {
  id: string;
  quizId: string;
  studentId: string;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  score: number | null;
  attemptAnswers: Record<string, any>;
  questions: QuestionItemDto[];
}
