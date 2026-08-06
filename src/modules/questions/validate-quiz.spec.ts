import { validateQuestion, validateQuiz } from './validate-quiz';

describe('validateQuiz', () => {
  it('returns error when quiz has no visible questions', () => {
    const result = validateQuiz({ questions: [] });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['This quiz has no questions']);
  });

  it('ignores hidden questions when counting', () => {
    const result = validateQuiz({
      questions: [
        {
          text: 'Hidden',
          type: 'MCQ',
          isHidden: true,
          options: [
            { option: 'A', isCorrect: true },
            { option: 'B', isCorrect: false },
          ],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['This quiz has no questions']);
  });

  it('returns error when MCQ has only one option', () => {
    const result = validateQuiz({
      questions: [
        {
          text: 'Pick one',
          type: 'MCQ',
          isHidden: false,
          options: [{ option: 'Only', isCorrect: true }],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Question 1 has only one option');
  });

  it('returns error when no correct answer is marked', () => {
    const result = validateQuiz({
      questions: [
        {
          text: 'No correct',
          type: 'MCQ',
          isHidden: false,
          options: [
            { option: 'A', isCorrect: false },
            { option: 'B', isCorrect: false },
          ],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Question 1 has no correct answer marked');
  });

  it('returns error when question has no text', () => {
    const result = validateQuiz({
      questions: [
        {
          text: '   ',
          type: 'MCQ',
          isHidden: false,
          options: [
            { option: 'A', isCorrect: true },
            { option: 'B', isCorrect: false },
          ],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Question 1 has no text');
  });

  it('requires exactly two options for True/False', () => {
    const result = validateQuiz({
      questions: [
        {
          text: 'Sky is blue',
          type: 'TRUE_FALSE',
          isHidden: false,
          options: [{ option: 'True', isCorrect: true }],
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Question 1 must have exactly two options for True/False',
    );
  });

  it('accepts a valid MCQ quiz', () => {
    const result = validateQuiz({
      questions: [
        {
          text: 'What is 2+2?',
          type: 'MCQ',
          isHidden: false,
          options: [
            { option: '3', isCorrect: false },
            { option: '4', isCorrect: true },
          ],
        },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('reports empty and duplicate option text precisely', () => {
    const result = validateQuestion({
      text: 'Pick one',
      type: 'MCQ',
      isHidden: false,
      options: [
        { option: ' Alpha ', isCorrect: true },
        { option: 'alpha', isCorrect: false },
        { option: ' ', isCorrect: false },
      ],
    });

    expect(result.errors).toContain(
      'Question has duplicate option text: "alpha"',
    );
    expect(result.errors).toContain('Question option 3 has no text');
  });

  it('rejects multiple correct answers', () => {
    const result = validateQuestion({
      text: 'Pick one',
      type: 'MCQ',
      isHidden: false,
      options: [
        { option: 'A', isCorrect: true },
        { option: 'B', isCorrect: true },
      ],
    });

    expect(result.errors).toContain(
      'Question has multiple correct answers marked',
    );
  });

  it('requires canonical True and False values', () => {
    const result = validateQuestion({
      text: 'Correct?',
      type: 'TRUE_FALSE',
      isHidden: false,
      options: [
        { option: 'Yes', isCorrect: true },
        { option: 'No', isCorrect: false },
      ],
    });

    expect(result.errors).toContain(
      'Question must use exactly the canonical True and False options',
    );
  });

  it('rejects OPEN_ENDED for objective-only authoring', () => {
    const result = validateQuestion({
      text: 'Explain',
      type: 'OPEN_ENDED',
      isHidden: false,
      options: [],
    });

    expect(result.errors).toContain(
      'Question uses OPEN_ENDED, which is not supported by objective-only scoring',
    );
  });
});
