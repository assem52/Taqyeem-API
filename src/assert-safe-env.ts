export function assertNoMockAuthInProduction(
  nodeEnv: string | undefined,
  mockStudentId: string | undefined,
): void {
  if (nodeEnv === 'production' && mockStudentId) {
    throw new Error(
      'MOCK_STUDENT_ID is set but NODE_ENV=production. This is a dev-only ' +
        'auth shim (see student-quizzes.controller.ts) and must never be ' +
        'present outside local development. Remove MOCK_STUDENT_ID from ' +
        'this environment\'s configuration before starting the app.',
    );
  }
}
