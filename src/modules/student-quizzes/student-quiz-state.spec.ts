import { deriveStudentState, resolveAccess } from './student-quiz-state';

describe('deriveStudentState', () => {
  const openDate = new Date('2026-01-01T00:00:00Z');
  const closeDate = new Date('2026-01-31T00:00:00Z');

  it('is "Not open yet" before the window opens', () => {
    const now = new Date('2025-12-31T23:59:59Z');
    expect(deriveStudentState(undefined, openDate, closeDate, now)).toBe('Not open yet');
  });

  it('is "Not open yet" for an IN_PROGRESS attempt before the open date', () => {
    const now = new Date('2025-12-31T23:59:59Z');
    const state = deriveStudentState({ status: 'IN_PROGRESS' }, openDate, closeDate, now);
    expect(state).toBe('Not open yet');

    const access = resolveAccess('VERIFIED', state, openDate, closeDate);
    expect(access.canStart).toBe(false);
    expect(access.blockedReason).toMatch(/opens on/i);
  });

  it('is "Not started" inside the window with no attempt', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    expect(deriveStudentState(undefined, openDate, closeDate, now)).toBe('Not started');
  });

  it('is "In progress" with a live attempt inside the window', () => {
    const now = new Date('2026-01-15T00:00:00Z');
    expect(deriveStudentState({ status: 'IN_PROGRESS' }, openDate, closeDate, now)).toBe('In progress');
  });

  it('is "Submitted" once submitted, even after the window closes', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(deriveStudentState({ status: 'SUBMITTED' }, openDate, closeDate, now)).toBe('Submitted');
  });

  it('treats AUTO_SUBMITTED the same as SUBMITTED', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(deriveStudentState({ status: 'AUTO_SUBMITTED' }, openDate, closeDate, now)).toBe('Submitted');
  });

  it('is "Closed" after the window, with no attempt', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(deriveStudentState(undefined, openDate, closeDate, now)).toBe('Closed');
  });

  it('is "Closed" for a still-in-progress attempt whose window has passed (never got submitted)', () => {
    const now = new Date('2026-02-01T00:00:00Z');
    expect(deriveStudentState({ status: 'IN_PROGRESS' }, openDate, closeDate, now)).toBe('Closed');
  });
});

describe('resolveAccess', () => {
  const openDate = new Date('2026-01-01T00:00:00Z');
  const closeDate = new Date('2026-01-31T00:00:00Z');

  it('blocks an unverified student regardless of quiz state, and says why', () => {
    const result = resolveAccess('UNVERIFIED', 'Not started', openDate, closeDate);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/verify your email/i);
  });

  it('blocks and names the date for a closed quiz', () => {
    const result = resolveAccess('VERIFIED', 'Closed', openDate, closeDate);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/closed on/i);
  });

  it('blocks and names the date for a not-yet-open quiz', () => {
    const result = resolveAccess('VERIFIED', 'Not open yet', openDate, closeDate);
    expect(result.canStart).toBe(false);
    expect(result.blockedReason).toMatch(/opens on/i);
  });

  it('blocks a re-visit to an already-submitted quiz', () => {
    const result = resolveAccess('VERIFIED', 'Submitted', openDate, closeDate);
    expect(result.canStart).toBe(false);
  });

  it('allows starting when verified, open, and not yet attempted', () => {
    const result = resolveAccess('VERIFIED', 'Not started', openDate, closeDate);
    expect(result.canStart).toBe(true);
    expect(result.blockedReason).toBeUndefined();
  });
});
