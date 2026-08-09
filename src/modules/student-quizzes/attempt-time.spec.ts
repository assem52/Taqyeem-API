import { computeAttemptDeadline, computeRemainingSeconds } from './attempt-time';

describe('attempt-time', () => {
  const startedAt = new Date('2026-08-09T10:00:00Z');

  it('uses duration when it ends before closesAt', () => {
    const closesAt = new Date('2026-08-09T12:00:00Z');
    const deadline = computeAttemptDeadline(startedAt, 30, closesAt);
    expect(deadline.toISOString()).toBe('2026-08-09T10:30:00.000Z');
  });

  it('uses closesAt when it ends before duration', () => {
    const closesAt = new Date('2026-08-09T10:15:00Z');
    const deadline = computeAttemptDeadline(startedAt, 60, closesAt);
    expect(deadline.toISOString()).toBe('2026-08-09T10:15:00.000Z');
  });

  it('computes remaining seconds from server now', () => {
    const closesAt = new Date('2026-08-09T12:00:00Z');
    const now = new Date('2026-08-09T10:10:00Z');
    expect(computeRemainingSeconds(startedAt, 30, closesAt, now)).toBe(20 * 60);
  });

  it('never returns negative remaining time', () => {
    const closesAt = new Date('2026-08-09T12:00:00Z');
    const now = new Date('2026-08-09T11:00:00Z');
    expect(computeRemainingSeconds(startedAt, 30, closesAt, now)).toBe(0);
  });
});
