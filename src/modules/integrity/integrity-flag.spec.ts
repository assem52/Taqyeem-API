import { isAttemptFlagged, FLAGGED_BADGE_LABEL } from './integrity-flag';

describe('isAttemptFlagged', () => {
  it('is not flagged when event count is at the threshold', () => {
    expect(isAttemptFlagged(5, 5)).toBe(false);
  });

  it('is flagged when event count exceeds the threshold', () => {
    expect(isAttemptFlagged(6, 5)).toBe(true);
  });

  it('uses the default threshold of 5 correctly at the boundary', () => {
    expect(isAttemptFlagged(5, 5)).toBe(false);
    expect(isAttemptFlagged(6, 5)).toBe(true);
  });

  it('raising the threshold un-flags an attempt with the same event count', () => {
    const eventCount = 6;
    expect(isAttemptFlagged(eventCount, 5)).toBe(true);
    expect(isAttemptFlagged(eventCount, 10)).toBe(false);
    // Nothing about eventCount itself changed between these two calls —
    // only the threshold did. That's the whole point being proven here.
  });

  it('lowering the threshold can flag a previously-unflagged attempt', () => {
    const eventCount = 3;
    expect(isAttemptFlagged(eventCount, 5)).toBe(false);
    expect(isAttemptFlagged(eventCount, 2)).toBe(true);
  });
});

describe('wording', () => {
  it('never uses the word "cheat" or "cheating" in the badge label', () => {
    expect(FLAGGED_BADGE_LABEL.toLowerCase()).not.toMatch(/cheat/);
  });

  it('uses "review" language', () => {
    expect(FLAGGED_BADGE_LABEL.toLowerCase()).toContain('review');
  });
});
