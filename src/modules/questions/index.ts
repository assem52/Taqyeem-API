/**
 * Public question-bank exports for other modules (especially Learner 2 publish).
 * Import from here or from `./validate-quiz` — never duplicate validity rules.
 */
export {
  getVisibleQuestions,
  validateQuestion,
  validateQuiz,
} from './validate-quiz';
export type {
  QuestionForValidation,
  QuestionTypeForValidation,
  QuizForValidation,
  QuizOptionForValidation,
  ValidationResult,
} from './validate-quiz.types';
