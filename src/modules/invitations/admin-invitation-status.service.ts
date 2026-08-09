import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from './email.service';
import { countByStatus, deriveInvitationStatuses } from './invitation-status';
import {
  InvitationStatus,
  INVITATION_STATUS_ORDER,
  PersonAttemptFacts,
  SendEvent,
  WRONG_EMAIL_DISCLAIMER,
} from './invitation-status.types';
import {
  InvitationStatusListDto,
  InvitationStatusRowDto,
} from './dto/invitation-status-list.dto';
import {
  BulkInviteItemResult,
  BulkInviteResponseDto,
} from './dto/bulk-invite.dto';
import { QuizStatus } from '@prisma/client';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class AdminInvitationStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async getInvitationStatus(quizId: string): Promise<InvitationStatusListDto> {
    const [invitations, enrollments, attempts, emailLogs] = await Promise.all([
      this.prisma.invitation.findMany({
        where: { quizId },
      }),
      this.prisma.enrollment.findMany({
        where: { quizId },
        include: { student: true },
      }),
      this.prisma.attempt.findMany({
        where: { quizId },
        include: { student: true },
      }),
      this.prisma.emailLog.findMany({
        where: { invitation: { quizId } },
        include: { invitation: true },
      }),
    ]);

    // A person invited twice appears once — dedupe by normalized email.
    const invitedPeople = [
      ...new Set(invitations.map((invitation) => normalizeEmail(invitation.email))),
    ];
    const invitedSet = new Set(invitedPeople);

    const factsByPerson = new Map<string, PersonAttemptFacts>();

    for (const enrollment of enrollments) {
      const email = normalizeEmail(enrollment.student.email);
      if (!invitedSet.has(email)) continue;
      factsByPerson.set(email, {
        isRegisteredWithMatchingEmail: true,
        attemptStatus: null,
      });
    }

    for (const attempt of attempts) {
      const email = normalizeEmail(attempt.student.email);
      if (!invitedSet.has(email)) continue;
      const existing = factsByPerson.get(email) ?? {
        isRegisteredWithMatchingEmail: true,
        attemptStatus: null,
      };
      factsByPerson.set(email, { ...existing, attemptStatus: attempt.status });
    }

    const invitationEmailById = new Map(
      invitations.map((invitation) => [invitation.id, normalizeEmail(invitation.email)]),
    );

    const sendEvents: SendEvent[] = emailLogs.map((log) => ({
      email:
        invitationEmailById.get(log.invitationId) ??
        normalizeEmail(log.invitation.email),
      status: log.status,
      occurredAt: log.occurredAt,
    }));

    const rows = deriveInvitationStatuses(invitedPeople, sendEvents, factsByPerson);
    const counts = countByStatus(rows);

    const failedLogIdByPerson = new Map(
      emailLogs
        .filter((log) => log.status === 'FAILED')
        .map((log) => [
          invitationEmailById.get(log.invitationId) ??
            normalizeEmail(log.invitation.email),
          log.id,
        ]),
    );

    const studentNameByEmail = new Map<string, string>();
    for (const enrollment of enrollments) {
      studentNameByEmail.set(normalizeEmail(enrollment.student.email), enrollment.student.name);
    }
    for (const attempt of attempts) {
      studentNameByEmail.set(normalizeEmail(attempt.student.email), attempt.student.name);
    }

    const statusRank = new Map(
      INVITATION_STATUS_ORDER.map((status, index) => [status, index]),
    );

    const invitationIdByEmail = new Map(
      invitations.map((invitation) => [
        normalizeEmail(invitation.email),
        invitation.id,
      ]),
    );

    const rowDtos: InvitationStatusRowDto[] = rows
      .map((row) => {
        const invitationId = invitationIdByEmail.get(row.email);
        return {
          email: row.email,
          studentName: studentNameByEmail.get(row.email) ?? null,
          status: row.status,
          invitationId: invitationId ?? null,
          inviteUrl: invitationId
            ? this.emailService.buildInviteUrl(invitationId)
            : null,
          ...(row.status === InvitationStatus.FAILED
            ? { emailLogId: failedLogIdByPerson.get(row.email) }
            : {}),
        };
      })
      .sort(
        (left, right) =>
          statusRank.get(left.status)! - statusRank.get(right.status)! ||
          (left.studentName ?? left.email).localeCompare(
            right.studentName ?? right.email,
          ),
      );

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: rows.length,
        byStatus: counts,
      },
      rows: rowDtos,
      note: WRONG_EMAIL_DISCLAIMER,
    };
  }

  /**
   * Resilient Bulk Invite Processor.
   * Processes each recipient individually. Faults on one row NEVER abort the batch.
   */
  async bulkInviteStudents(
    quizId: string,
    rawEmails: string[],
  ): Promise<BulkInviteResponseDto> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw new BadRequestException(
        'Publish the quiz before inviting students.',
      );
    }

    const existingInvitations = await this.prisma.invitation.findMany({
      where: { quizId },
    });

    const existingEmailSet = new Set(
      existingInvitations.map((inv) => normalizeEmail(inv.email)),
    );

    const batchSeenSet = new Set<string>();

    const results: BulkInviteItemResult[] = [];
    let sentCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const rawInput of rawEmails) {
      const trimmed = (rawInput || '').trim();

      if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
        invalidCount++;
        results.push({
          email: rawInput,
          status: 'INVALID',
          reason: 'Invalid email address format',
        });
        continue;
      }

      const normEmail = normalizeEmail(trimmed);

      if (existingEmailSet.has(normEmail) || batchSeenSet.has(normEmail)) {
        // Still enroll an existing student account if they somehow missed enrollment
        // (invitation row exists, but dashboard only shows Enrollment).
        await this.enrollExistingStudentByEmail(quizId, normEmail);
        duplicateCount++;
        results.push({
          email: normEmail,
          status: 'DUPLICATE',
          reason: 'Student has already been invited to this quiz',
        });
        continue;
      }

      batchSeenSet.add(normEmail);

      try {
        // Create invitation record
        const invitation = await this.prisma.invitation.create({
          data: {
            quizId,
            email: normEmail,
          },
        });

        // Existing accounts get dashboard access immediately (no accept-link step).
        await this.enrollExistingStudentByEmail(quizId, normEmail);

        // Dispatch email deterministically
        const sendRes = await this.emailService.sendInvitationEmail(
          invitation.id,
          normEmail,
          quiz.title,
        );

        if (sendRes.status === 'SENT') {
          sentCount++;
          results.push({
            email: normEmail,
            status: 'SENT',
            invitationId: invitation.id,
            inviteUrl: this.emailService.buildInviteUrl(invitation.id),
          });
        } else {
          failedCount++;
          results.push({
            email: normEmail,
            status: 'FAILED',
            reason: sendRes.errorMessage || 'Email dispatch failed',
            invitationId: invitation.id,
            inviteUrl: this.emailService.buildInviteUrl(invitation.id),
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          email: normEmail,
          status: 'FAILED',
          reason: err.message || 'Unexpected failure while processing invitation',
        });
      }
    }

    return {
      quizId,
      total: rawEmails.length,
      sent: sentCount,
      failed: failedCount,
      duplicates: duplicateCount,
      invalid: invalidCount,
      deliveryMode: this.emailService.deliveryMode,
      results,
    };
  }

  /**
   * If a Student already exists for this email, ensure Enrollment so the quiz
   * appears on their dashboard / notification bell without accepting a link.
   */
  private async enrollExistingStudentByEmail(
    quizId: string,
    email: string,
  ): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!student) return;

    await this.prisma.enrollment.upsert({
      where: {
        quizId_studentId: { quizId, studentId: student.id },
      },
      create: { quizId, studentId: student.id },
      update: {},
    });
  }

  /**
   * Re-dispatch invitation email for an existing invite (failed or operator resend).
   */
  async resendInvitation(
    quizId: string,
    invitationId: string,
  ): Promise<{
    email: string;
    status: 'SENT' | 'FAILED';
    inviteUrl: string;
    reason?: string;
    deliveryMode: 'live' | 'simulated';
  }> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, quizId },
      include: { quiz: { select: { title: true, status: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found for this quiz.');
    }

    if (invitation.quiz.status !== QuizStatus.PUBLISHED) {
      throw new BadRequestException(
        'Publish the quiz before resending invitations.',
      );
    }

    const sendRes = await this.emailService.sendInvitationEmail(
      invitation.id,
      invitation.email,
      invitation.quiz.title,
    );

    const inviteUrl = this.emailService.buildInviteUrl(invitation.id);

    if (sendRes.status === 'SENT') {
      return {
        email: invitation.email,
        status: 'SENT',
        inviteUrl,
        deliveryMode: this.emailService.deliveryMode,
      };
    }

    return {
      email: invitation.email,
      status: 'FAILED',
      inviteUrl,
      reason: sendRes.errorMessage || 'Email dispatch failed',
      deliveryMode: this.emailService.deliveryMode,
    };
  }
}
