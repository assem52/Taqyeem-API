/**
 * Shared quiz validity rules — single source of truth for Slot 2 (publish)
 * and Slot 3 (Omar). Import this; never copy the checks elsewhere.
 *
 * Contract: docs/sprint 2/publish-contract.md §A
 */

import type {
  QuizForValidation,
  QuestionForValidation,
  ValidationResult,
} from './validate-quiz.types';

export type {
  QuizForValidation,
  QuestionForValidation,
  QuizOptionForValidation,
  QuestionTypeForValidation,
  ValidationResult,
} from './validate-quiz.types';

/** Visible questions only — hidden ones stay in DB for old attempts. */
export function getVisibleQuestions(
  questions: QuestionForValidation[],
): QuestionForValidation[] {
  return questions.filter(
    (question) => !question.isHidden && question.deletedAt == null,
  );
}

/** Validate one authored question. The label is used by quiz-level errors. */
export function validateQuestion(
  question: QuestionForValidation,
  label = 'Question',
): ValidationResult {
  const errors: string[] = [];
  const options = question.options ?? [];

  if (!(question.text?.trim() ?? '')) {
    errors.push(`${label} has no text`);
  }

  const seenOptions = new Set<string>();
  options.forEach((option, index) => {
    const text = option.option?.trim() ?? '';
    if (!text) {
      errors.push(`${label} option ${index + 1} has no text`);
      return;
    }

    const normalized = text.toLocaleLowerCase();
    if (seenOptions.has(normalized)) {
      errors.push(`${label} has duplicate option text: "${text}"`);
    }
    seenOptions.add(normalized);
  });

  if (question.type === 'OPEN_ENDED') {
    if (options.length > 0) {
      errors.push(`${label} essay questions must not have options`);
    }
    return { valid: errors.length === 0, errors };
  }

  if (question.type === 'MCQ') {
    if (options.length === 1) {
      errors.push(`${label} has only one option`);
    } else if (options.length < 2) {
      errors.push(`${label} must have at least two options for MCQ`);
    }
  }

  if (question.type === 'TRUE_FALSE') {
    if (options.length !== 2) {
      errors.push(`${label} must have exactly two options for True/False`);
    } else {
      const values = options.map((option) => option.option.trim()).sort();
      if (values[0] !== 'False' || values[1] !== 'True') {
        errors.push(
          `${label} must use exactly the canonical True and False options`,
        );
      }
    }
  }

  const correctCount = options.filter((option) => option.isCorrect).length;
  if (correctCount === 0) {
    errors.push(`${label} has no correct answer marked`);
  } else if (correctCount > 1) {
    errors.push(`${label} has multiple correct answers marked`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a quiz for publish (and any other gate that must reuse the same rules).
 * Question numbers (N) are 1-based among visible questions only.
 */
export function validateQuiz(quiz: QuizForValidation): ValidationResult {
  const errors: string[] = [];
  const visibleQuestions = getVisibleQuestions(quiz.questions);

  if (visibleQuestions.length === 0) {
    errors.push('This quiz has no questions');
    return { valid: false, errors };
  }

  visibleQuestions.forEach((question, index) => {
    errors.push(...validateQuestion(question, `Question ${index + 1}`).errors);
  });

  return { valid: errors.length === 0, errors };
}
