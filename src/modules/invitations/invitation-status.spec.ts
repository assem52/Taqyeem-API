import { AttemptStatus } from '@prisma/client';
import {
  classifyInvitationStatus,
  countByStatus,
  deriveInvitationStatuses,
} from './invitation-status';
import {
  InvitationStatus,
  PersonAttemptFacts,
  SendEvent,
} from './invitation-status.types';
import { describe, it, expect } from '@jest/globals';

describe('classifyInvitationStatus — precedence', () => {
  it('submitted beats everything else', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: true,
      attemptStatus: AttemptStatus.SUBMITTED,
    };
    expect(classifyInvitationStatus(true, false, facts)).toBe(
      InvitationStatus.SUBMITTED,
    );
  });

  it('AUTO_SUBMITTED counts the same as SUBMITTED', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: false,
      attemptStatus: AttemptStatus.AUTO_SUBMITTED,
    };
    expect(classifyInvitationStatus(false, false, facts)).toBe(
      InvitationStatus.SUBMITTED,
    );
  });

  it('started beats accepted/sent/failed', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: true,
      attemptStatus: AttemptStatus.IN_PROGRESS,
    };
    expect(classifyInvitationStatus(true, false, facts)).toBe(
      InvitationStatus.STARTED,
    );
  });

  it('accepted when registered with a matching email and no attempt yet', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: true,
      attemptStatus: null,
    };
    expect(classifyInvitationStatus(true, false, facts)).toBe(
      InvitationStatus.ACCEPTED,
    );
  });

  it('failed when the most recent send failed and nothing more advanced happened', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: false,
      attemptStatus: null,
    };
    expect(classifyInvitationStatus(false, true, facts)).toBe(
      InvitationStatus.FAILED,
    );
  });

  it('sent when delivered within the pending window and nothing else observed', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: false,
      attemptStatus: null,
    };
    expect(classifyInvitationStatus(true, false, facts)).toBe(
      InvitationStatus.SENT,
    );
  });

  it('not_started when nothing at all is known', () => {
    const facts: PersonAttemptFacts = {
      isRegisteredWithMatchingEmail: false,
      attemptStatus: null,
    };
    expect(classifyInvitationStatus(false, false, facts)).toBe(
      InvitationStatus.NOT_STARTED,
    );
  });
});

describe('deriveInvitationStatuses — dedup, time window, and aggregation', () => {
  const NOW = new Date('2026-02-01T00:00:00Z');

  it('ACCEPTANCE: a person invited twice appears once', () => {
    const invitedPeople = ['a@example.com'];
    const sendEvents: SendEvent[] = [
      {
        email: 'a@example.com',
        status: 'FAILED',
        occurredAt: new Date('2026-01-31T00:00:00Z'),
      },
      {
        email: 'a@example.com',
        status: 'SENT',
        occurredAt: new Date('2026-01-31T12:00:00Z'),
      },
    ];

    const rows = deriveInvitationStatuses(invitedPeople, sendEvents, new Map(), NOW);

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(InvitationStatus.SENT);
  });

  it('BUGFIX: a success followed by a LATER failure still surfaces as failed', () => {
    const rows = deriveInvitationStatuses(
      ['flaky@example.com'],
      [
        {
          email: 'flaky@example.com',
          status: 'SENT',
          occurredAt: new Date(NOW.getTime() - 10 * 60 * 60 * 1000),
        },
        {
          email: 'flaky@example.com',
          status: 'FAILED',
          occurredAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
        },
      ],
      new Map(),
      NOW,
    );

    expect(rows[0].status).toBe(InvitationStatus.FAILED);
  });

  it('ACCEPTANCE: a person invited who never registered still appears, marked as such', () => {
    const rows = deriveInvitationStatuses(
      ['never-registered@example.com'],
      [
        {
          email: 'never-registered@example.com',
          status: 'SENT',
          occurredAt: new Date('2026-01-31T12:00:00Z'),
        },
      ],
      new Map(),
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(InvitationStatus.SENT);
  });

  it('ACCEPTANCE: a person who registered with a different email appears as not_started once the send has aged out', () => {
    const rows = deriveInvitationStatuses(
      ['invited@example.com'],
      [
        {
          email: 'invited@example.com',
          status: 'SENT',
          occurredAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      new Map(),
      NOW,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(InvitationStatus.NOT_STARTED);
  });

  it('ACCEPTANCE: sixty invitations, forty-nine attempts, eleven not-started, counts sum to sixty', () => {
    const invitedPeople = Array.from({ length: 60 }, (_, i) => `person${i}@example.com`);

    const facts = new Map<string, PersonAttemptFacts>();
    for (let i = 0; i < 30; i++) {
      facts.set(`person${i}@example.com`, {
        isRegisteredWithMatchingEmail: true,
        attemptStatus: AttemptStatus.SUBMITTED,
      });
    }
    for (let i = 30; i < 49; i++) {
      facts.set(`person${i}@example.com`, {
        isRegisteredWithMatchingEmail: true,
        attemptStatus: AttemptStatus.IN_PROGRESS,
      });
    }

    const rows = deriveInvitationStatuses(invitedPeople, [], facts, NOW);
    const counts = countByStatus(rows);

    expect(counts[InvitationStatus.NOT_STARTED]).toBe(11);
    expect(counts[InvitationStatus.SUBMITTED]).toBe(30);
    expect(counts[InvitationStatus.STARTED]).toBe(19);

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(60);
  });

  it('sanity-checks the pending window boundary itself', () => {
    const justInside = new Date(NOW.getTime() - 47 * 60 * 60 * 1000);
    const justOutside = new Date(NOW.getTime() - 49 * 60 * 60 * 1000);

    const rowsInside = deriveInvitationStatuses(
      ['p@example.com'],
      [{ email: 'p@example.com', status: 'SENT', occurredAt: justInside }],
      new Map(),
      NOW,
    );
    const rowsOutside = deriveInvitationStatuses(
      ['p@example.com'],
      [{ email: 'p@example.com', status: 'SENT', occurredAt: justOutside }],
      new Map(),
      NOW,
    );

    expect(rowsInside[0].status).toBe(InvitationStatus.SENT);
    expect(rowsOutside[0].status).toBe(InvitationStatus.NOT_STARTED);
  });
});
