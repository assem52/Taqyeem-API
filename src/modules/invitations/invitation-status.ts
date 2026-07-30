import { AttemptStatus } from '@prisma/client';
import {
  InvitationStatus,
  InvitationStatusRow,
  PENDING_WINDOW_HOURS,
  PersonAttemptFacts,
  SendEvent,
} from './invitation-status.types';

function isTerminalAttempt(status: AttemptStatus): boolean {
  return (
    status === AttemptStatus.SUBMITTED || status === AttemptStatus.AUTO_SUBMITTED
  );
}
export function classifyInvitationStatus(
  hasSuccessfulSendWithinWindow: boolean,
  hasMostRecentSendFailed: boolean,
  facts: PersonAttemptFacts,
): InvitationStatus {
  if (facts.attemptStatus != null && isTerminalAttempt(facts.attemptStatus)) {
    return InvitationStatus.SUBMITTED;
  }
  if (facts.attemptStatus === AttemptStatus.IN_PROGRESS) {
    return InvitationStatus.STARTED;
  }
  if (facts.isRegisteredWithMatchingEmail) {
    return InvitationStatus.ACCEPTED;
  }
  if (hasMostRecentSendFailed) {
    return InvitationStatus.FAILED;
  }
  if (hasSuccessfulSendWithinWindow) {
    return InvitationStatus.SENT;
  }
  return InvitationStatus.NOT_STARTED;
}
export function deriveInvitationStatuses(
  invitedPeople: string[],
  sendEvents: SendEvent[],
  attemptFactsByPerson: Map<string, PersonAttemptFacts>,
  now: Date = new Date(),
): InvitationStatusRow[] {
  const sendsByPerson = new Map<string, SendEvent[]>();
  for (const event of sendEvents) {
    const list = sendsByPerson.get(event.personKey) ?? [];
    list.push(event);
    sendsByPerson.set(event.personKey, list);
  }

  return invitedPeople.map((personKey) => {
    const sends = (sendsByPerson.get(personKey) ?? [])
      .slice()
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    const lastEvent = sends[sends.length - 1];
    const hasMostRecentSendFailed = lastEvent?.status === 'FAILED';
    const hasSuccessfulSendWithinWindow =
      lastEvent?.status === 'SENT' &&
      now.getTime() - lastEvent.occurredAt.getTime() <=
        PENDING_WINDOW_HOURS * 60 * 60 * 1000;

    const facts = attemptFactsByPerson.get(personKey) ?? {
      isRegisteredWithMatchingEmail: false,
      attemptStatus: null,
    };

    return {
      personKey,
      status: classifyInvitationStatus(
        hasSuccessfulSendWithinWindow,
        hasMostRecentSendFailed,
        facts,
      ),
    };
  });
}

export function countByStatus(
  rows: InvitationStatusRow[],
): Record<InvitationStatus, number> {
  const counts: Record<InvitationStatus, number> = {
    [InvitationStatus.SUBMITTED]: 0,
    [InvitationStatus.STARTED]: 0,
    [InvitationStatus.ACCEPTED]: 0,
    [InvitationStatus.FAILED]: 0,
    [InvitationStatus.SENT]: 0,
    [InvitationStatus.NOT_STARTED]: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}
