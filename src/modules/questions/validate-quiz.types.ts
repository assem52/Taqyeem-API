/**
 * Input/output shapes for shared quiz validity rules.
 * Pure types — no Nest, no Prisma. Omar (Slot 3) imports these too.
 */

export type QuestionTypeForValidation = 'MCQ' | 'TRUE_FALSE' | 'OPEN_ENDED';

export type QuizOptionForValidation = {
  id?: string;
  option: string;
  isCorrect: boolean;
};

export type QuestionForValidation = {
  id?: string;
  text: string;
  type: QuestionTypeForValidation;
  isHidden: boolean;
  deletedAt?: Date | string | null;
  options: QuizOptionForValidation[];
};

export type QuizForValidation = {
  questions: QuestionForValidation[];
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};
