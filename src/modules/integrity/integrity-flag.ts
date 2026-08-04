export function isAttemptFlagged(eventCount: number, thresholdApplied: number): boolean {
  return eventCount > thresholdApplied;
}
export const FLAGGED_BADGE_LABEL = 'Flagged for review';
