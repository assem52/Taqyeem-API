/**
 * Contract for integrity-flag lookups.
 * Slot 4 will provide a Prisma-backed implementation; Sprint 3 uses the seed adapter.
 */
export interface IntegrityFlag {
  isActive: boolean;
  reviewNote?: string;
}

export const INTEGRITY_FLAG_READER = Symbol('INTEGRITY_FLAG_READER');

export interface IntegrityFlagReader {
  getFlag(studentId: string, quizId: string): IntegrityFlag | null;
}
