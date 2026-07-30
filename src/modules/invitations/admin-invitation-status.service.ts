import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
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

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class AdminInvitationStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvitationStatus(quizId?: string): Promise<InvitationStatusListDto> {
    const [invitations, enrollments, attempts, emailLogs] = await Promise.all([
      this.prisma.invitation.findMany({
        where: quizId ? { quizId } : {},
      }),
      this.prisma.enrollment.findMany({
        where: quizId ? { quizId } : {},
        include: { student: true },
      }),
      this.prisma.attempt.findMany({
        where: quizId ? { quizId } : {},
        include: { student: true },
      }),
      this.prisma.emailLog.findMany({
        where: quizId ? { invitation: { quizId } } : {},
        include: { invitation: true },
      }),
    ]);

    // A person invited twice appears once — dedupe by normalized email.
    const invitedPeople = [
      ...new Set(invitations.map((invitation) => normalizeEmail(invitation.email))),
    ];
    const invitedSet = new Set(invitedPeople);

    const factsByPerson = new Map<string, PersonAttemptFacts>();

    // Accepting the invitation shows up as an Enrollment, before any Attempt
    // exists. (Assumption — confirm this is how Slot 3 actually signals
    // acceptance once it lands; swap this lookup if it works differently.)
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
      // Registered under an email nobody invited — the "wrong email" case.
      // Deliberately left unlinked; it will correctly surface as its own
      // not_started row under the invited email instead.
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
      personKey:
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
        personKey: row.personKey,
        studentName: studentNameByEmail.get(row.personKey) ?? null,
        status: row.status,
        ...(row.status === InvitationStatus.FAILED
          ? { emailLogId: failedLogIdByPerson.get(row.personKey) }
          : {}),
      }))
      .sort(
        (left, right) =>
          statusRank.get(left.status)! - statusRank.get(right.status)! ||
          (left.studentName ?? left.personKey).localeCompare(
            right.studentName ?? right.personKey,
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
}
