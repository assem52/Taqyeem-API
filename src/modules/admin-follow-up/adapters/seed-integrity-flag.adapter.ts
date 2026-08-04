import {
  IntegrityFlag,
  IntegrityFlagReader,
} from './integrity-flag.reader';

/**
 * Temporary integrity-flag source until Slot 4 persists flags in the DB.
 * Key format: `${studentId}:${quizId}`
 */
export const SEED_INTEGRITY_FLAGS: Record<
  string,
  { isActive: boolean; reviewNote: string }
> = {
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee:66666666-6666-6666-6666-666666666666':
    {
      isActive: true,
      reviewNote: 'Multiple rapid tab switches detected — review required',
    },
};

export class SeedIntegrityFlagAdapter implements IntegrityFlagReader {
  getFlag(studentId: string, quizId: string): IntegrityFlag | null {
    return SEED_INTEGRITY_FLAGS[`${studentId}:${quizId}`] ?? null;
  }
}

/** Shared Sprint 3 instance — swap for PrismaIntegrityFlagAdapter when Slot 4 lands. */
export const seedIntegrityFlagAdapter = new SeedIntegrityFlagAdapter();
