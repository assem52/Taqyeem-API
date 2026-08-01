import { AttemptStatus } from '@prisma/client';

export enum InvitationStatus {
  SUBMITTED = 'SUBMITTED',
  STARTED = 'STARTED',
  ACCEPTED = 'ACCEPTED',
  FAILED = 'FAILED',
  SENT = 'SENT',
  NOT_STARTED = 'NOT_STARTED',
}
export const PENDING_WINDOW_HOURS = 48;

export interface SendEvent {
  email: string;
  status: 'SENT' | 'FAILED';
  occurredAt: Date;
}

export interface PersonAttemptFacts {
  isRegisteredWithMatchingEmail: boolean;
  attemptStatus: AttemptStatus | null;
}

export interface InvitationStatusRow {
  email: string;
  status: InvitationStatus;
}

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  [InvitationStatus.SUBMITTED]: 'Submitted',
  [InvitationStatus.STARTED]: 'Started',
  [InvitationStatus.ACCEPTED]: 'Accepted',
  [InvitationStatus.FAILED]: 'Failed',
  [InvitationStatus.SENT]: 'Sent',
  [InvitationStatus.NOT_STARTED]: 'Not started',
};

export const INVITATION_STATUS_ORDER: InvitationStatus[] = [
  InvitationStatus.FAILED,
  InvitationStatus.SENT,
  InvitationStatus.ACCEPTED,
  InvitationStatus.STARTED,
  InvitationStatus.SUBMITTED,
  InvitationStatus.NOT_STARTED,
];

export const WRONG_EMAIL_DISCLAIMER =
  'Not started can also mean the person registered using a different email than the one they were invited with.';
