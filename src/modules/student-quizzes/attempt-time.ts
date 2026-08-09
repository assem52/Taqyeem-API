/**
 * Shared helpers for attempt deadlines.
 * Deadline = earlier of (startedAt + duration) and quiz.closesAt.
 */

export function computeAttemptDeadline(
  startedAt: Date,
  durationMinutes: number,
  closesAt: Date,
): Date {
  const durationMs = Math.max(1, durationMinutes) * 60_000;
  const durationDeadline = new Date(startedAt.getTime() + durationMs);
  return durationDeadline.getTime() <= closesAt.getTime()
    ? durationDeadline
    : closesAt;
}

export function computeRemainingSeconds(
  startedAt: Date,
  durationMinutes: number,
  closesAt: Date,
  now: Date = new Date(),
): number {
  const deadline = computeAttemptDeadline(startedAt, durationMinutes, closesAt);
  return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
}
