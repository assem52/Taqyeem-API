export type StudentQuizState =
  | 'Not open yet'
  | 'Not started'
  | 'In progress'
  | 'Submitted'
  | 'Closed';

export type AttemptStatusLike = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
export type StudentStatusLike = 'VERIFIED' | 'UNVERIFIED';

export interface AttemptLike {
  status: AttemptStatusLike;
}

export interface AccessResult {
  canStart: boolean;
  blockedReason?: string;
}
export function deriveStudentState(
  attempt: AttemptLike | undefined,
  openDate: Date,
  closeDate: Date,
  now: Date,
): StudentQuizState {
  if (attempt?.status === 'SUBMITTED' || attempt?.status === 'AUTO_SUBMITTED') {
    return 'Submitted';
  }
  if (now > closeDate) {
    return 'Closed';
  }
  if (attempt?.status === 'IN_PROGRESS') {
    return 'In progress';
  }
  if (now < openDate) {
    return 'Not open yet';
  }
  return 'Not started';
}

export function resolveAccess(
  studentStatus: StudentStatusLike,
  studentState: StudentQuizState,
  openDate: Date,
  closeDate: Date,
): AccessResult {
  if (studentStatus === 'UNVERIFIED') {
    return { canStart: false, blockedReason: 'Verify your email before starting this quiz.' };
  }
  if (studentState === 'Not open yet') {
    return { canStart: false, blockedReason: `This quiz opens on ${openDate.toISOString()}.` };
  }
  if (studentState === 'Closed') {
    return { canStart: false, blockedReason: `This quiz closed on ${closeDate.toISOString()}.` };
  }
  if (studentState === 'Submitted') {
    return { canStart: false, blockedReason: 'You have already submitted this quiz.' };
  }
  return { canStart: true };
}
