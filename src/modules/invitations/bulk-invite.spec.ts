import { NotFoundException } from '@nestjs/common';
import { AdminInvitationStatusService } from './admin-invitation-status.service';
import { EmailLogStatus } from '@prisma/client';

describe('AdminInvitationStatusService — bulkInviteStudents', () => {
  function createService() {
    const prisma = {
      quiz: {
        findUnique: jest.fn(),
      },
      invitation: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const emailService = {
      sendInvitationEmail: jest.fn(),
      deliveryMode: 'simulated' as const,
    };

    return {
      service: new AdminInvitationStatusService(
        prisma as never,
        emailService as never,
      ),
      prisma,
      emailService,
    };
  }

  it('throws NotFoundException if quiz does not exist', async () => {
    const { service, prisma } = createService();
    prisma.quiz.findUnique.mockResolvedValue(null);

    await expect(
      service.bulkInviteStudents('non-existent', ['user@example.com']),
    ).rejects.toThrow(NotFoundException);
  });

  it('processes batch with sent, duplicate, and invalid emails without crashing', async () => {
    const { service, prisma, emailService } = createService();

    prisma.quiz.findUnique.mockResolvedValue({
      id: 'q-100',
      title: 'Sprint 4 Quiz',
    });

    prisma.invitation.findMany.mockResolvedValue([
      { id: 'inv-1', email: 'existing@example.com', quizId: 'q-100' },
    ]);

    prisma.invitation.create.mockResolvedValue({
      id: 'inv-new',
      email: 'newuser@example.com',
      quizId: 'q-100',
    });

    emailService.sendInvitationEmail.mockResolvedValue({
      status: EmailLogStatus.SENT,
    });

    const rawEmails = [
      '  newuser@example.com  ', // Valid new
      'existing@example.com',    // Existing duplicate
      'newuser@example.com',     // Intra-batch duplicate
      'not-an-email',            // Invalid format
    ];

    const result = await service.bulkInviteStudents('q-100', rawEmails);

    expect(result.total).toBe(4);
    expect(result.sent).toBe(1);
    expect(result.duplicates).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.deliveryMode).toBe('simulated');

    expect(result.results).toEqual([
      { email: 'newuser@example.com', status: 'SENT' },
      {
        email: 'existing@example.com',
        status: 'DUPLICATE',
        reason: 'Student has already been invited to this quiz',
      },
      {
        email: 'newuser@example.com',
        status: 'DUPLICATE',
        reason: 'Student has already been invited to this quiz',
      },
      {
        email: 'not-an-email',
        status: 'INVALID',
        reason: 'Invalid email address format',
      },
    ]);
  });

  it('handles email dispatch failure gracefully per recipient', async () => {
    const { service, prisma, emailService } = createService();

    prisma.quiz.findUnique.mockResolvedValue({
      id: 'q-100',
      title: 'Sprint 4 Quiz',
    });

    prisma.invitation.findMany.mockResolvedValue([]);

    prisma.invitation.create.mockResolvedValue({
      id: 'inv-fail',
      email: 'fail@example.com',
      quizId: 'q-100',
    });

    emailService.sendInvitationEmail.mockResolvedValue({
      status: EmailLogStatus.FAILED,
      errorMessage: 'SMTP Connection Timed Out',
    });

    const result = await service.bulkInviteStudents('q-100', ['fail@example.com']);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.deliveryMode).toBe('simulated');
    expect(result.results[0]).toEqual({
      email: 'fail@example.com',
      status: 'FAILED',
      reason: 'SMTP Connection Timed Out',
    });
  });
});
