import { Injectable, NotFoundException } from '@nestjs/common';
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

    const rowDtos: InvitationStatusRowDto[] = rows
      .map((row) => ({
        email: row.email,
        studentName: studentNameByEmail.get(row.email) ?? null,
        status: row.status,
        ...(row.status === InvitationStatus.FAILED
          ? { emailLogId: failedLogIdByPerson.get(row.email) }
          : {}),
      }))
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
          });
        } else {
          failedCount++;
          results.push({
            email: normEmail,
            status: 'FAILED',
            reason: sendRes.errorMessage || 'Email dispatch failed',
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
}
