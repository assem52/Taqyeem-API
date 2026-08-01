import { AttemptStatus } from '@prisma/client';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import { InvitationStatus } from './invitation-status.types';
import { describe, it, expect } from '@jest/globals';

const quizId = '66666666-6666-6666-6666-666666666666';

function createService() {
  const prisma = {
    invitation: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    attempt: { findMany: jest.fn() },
    emailLog: { findMany: jest.fn() },
  };

  return { service: new AdminInvitationStatusService(prisma as never), prisma };
}

describe('AdminInvitationStatusService', () => {
  it('ACCEPTANCE: dedupes a double invite, keeps a never-registered person, and flags a wrong-email registrant as not_started', async () => {
    const { service, prisma } = createService();

    prisma.invitation.findMany.mockResolvedValue([
      { id: 'inv-1', quizId, email: 'twice@example.com', invitedAt: new Date('2026-01-01T00:00:00Z') },
      { id: 'inv-2', quizId, email: 'Twice@Example.com', invitedAt: new Date('2026-01-02T00:00:00Z') }, // same person, re-invited
      { id: 'inv-3', quizId, email: 'ghost@example.com', invitedAt: new Date('2026-01-01T00:00:00Z') }, // never registers
      { id: 'inv-4', quizId, email: 'invited@example.com', invitedAt: new Date('2026-01-01T00:00:00Z') }, // registers under a different email
    ]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.attempt.findMany.mockResolvedValue([
      {
        studentId: 'student-x',
        quizId,
        status: AttemptStatus.SUBMITTED,
        student: { id: 'student-x', name: 'Wrong Email Person', email: 'actually-different@example.com' },
      },
    ]);
    prisma.emailLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        invitationId: 'inv-4',
        status: 'SENT',
        occurredAt: new Date('2026-01-01T00:00:00Z'), // 30 days before "now" further down — aged out
        invitation: { email: 'invited@example.com' },
      },
    ]);

    const result = await service.getInvitationStatus(quizId);

    expect(result.summary.total).toBe(3); // 'twice' deduped to one row
    const byPerson = new Map(result.rows.map((r) => [r.email, r.status]));
    expect(byPerson.get('twice@example.com')).toBe(InvitationStatus.NOT_STARTED);
    expect(byPerson.get('ghost@example.com')).toBe(InvitationStatus.NOT_STARTED);
    expect(byPerson.get('invited@example.com')).toBe(InvitationStatus.NOT_STARTED);
    expect(result.note).toContain('different email');
  });

  it('links a failed row to its email log entry for resending', async () => {
    const { service, prisma } = createService();

    prisma.invitation.findMany.mockResolvedValue([
      { id: 'inv-1', quizId, email: 'bounced@example.com', invitedAt: new Date() },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.attempt.findMany.mockResolvedValue([]);
    prisma.emailLog.findMany.mockResolvedValue([
      {
        id: 'log-99',
        invitationId: 'inv-1',
        status: 'FAILED',
        occurredAt: new Date(),
        invitation: { email: 'bounced@example.com' },
      },
    ]);

    const result = await service.getInvitationStatus(quizId);

    expect(result.rows[0].status).toBe(InvitationStatus.FAILED);
    expect(result.rows[0].emailLogId).toBe('log-99');
  });

  it('shows accepted for someone enrolled but not yet attempted', async () => {
    const { service, prisma } = createService();

    prisma.invitation.findMany.mockResolvedValue([
      { id: 'inv-1', quizId, email: 'signed-up@example.com', invitedAt: new Date() },
    ]);
    prisma.enrollment.findMany.mockResolvedValue([
      { quizId, studentId: 's1', student: { id: 's1', name: 'Signed Up', email: 'signed-up@example.com' } },
    ]);
    prisma.attempt.findMany.mockResolvedValue([]);
    prisma.emailLog.findMany.mockResolvedValue([]);

    const result = await service.getInvitationStatus(quizId);

    expect(result.rows[0].status).toBe(InvitationStatus.ACCEPTED);
    expect(result.rows[0].studentName).toBe('Signed Up');
  });
});
