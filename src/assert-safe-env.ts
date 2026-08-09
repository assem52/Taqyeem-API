export function isProductionEnv(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production';
}

/**
 * Non-production escape code for /auth/verify only.
 * Registration always emails a unique OTP; this code is a local fallback.
 * Null in production.
 */
export function resolveDevVerificationCode(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | null {
  if (isProductionEnv(nodeEnv)) {
    return null;
  }
  const fromEnv = process.env.DEV_VERIFICATION_CODE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : '00000';
}

export function assertNoMockAuthInProduction(
  nodeEnv: string | undefined,
  mockStudentId: string | undefined,
): void {
  if (isProductionEnv(nodeEnv) && mockStudentId) {
    throw new Error(
      'MOCK_STUDENT_ID is set but NODE_ENV=production. Remove MOCK_STUDENT_ID ' +
        'from this environment before starting the app.',
    );
  }
}

/** Comma-separated FRONTEND_URL / CORS_ORIGINS → allowlist for browser CORS. */
export function resolveCorsOrigins(): string[] | true {
  const raw =
    process.env.CORS_ORIGINS ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    '';
  const list = raw
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  if (list.length > 0) {
    return list;
  }

  // Dev convenience only — production must set FRONTEND_URL or CORS_ORIGINS.
  if (!isProductionEnv(process.env.NODE_ENV)) {
    return true;
  }

  throw new Error(
    'Production requires FRONTEND_URL or CORS_ORIGINS for CORS allowlisting.',
  );
}
