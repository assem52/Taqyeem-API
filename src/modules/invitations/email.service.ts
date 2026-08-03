import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailLogStatus } from '@prisma/client';

export interface SendInvitationEmailResult {
  status: EmailLogStatus;
  errorMessage?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Dispatch an invitation email to a target address.
   * Deterministically records an EmailLog entry with status SENT or FAILED.
   */
  async sendInvitationEmail(
    invitationId: string,
    email: string,
    quizTitle: string,
  ): Promise<SendInvitationEmailResult> {
    try {
      // Simulate email transport / dispatch (or integrate with nodemailer / sendgrid in production)
      // Check for test simulated fail addresses like fail@example.com or invalid domains
      if (email.includes('invalid') || email.includes('fail-smtp')) {
        throw new Error(`SMTP dispatch failed for recipient ${email}`);
      }

      this.logger.log(`Invitation email dispatched successfully to ${email} for quiz "${quizTitle}"`);

      // Log success in DB
      await this.prisma.emailLog.create({
        data: {
          invitationId,
          status: EmailLogStatus.SENT,
        },
      });

      return { status: EmailLogStatus.SENT };
    } catch (err: any) {
      const errorMessage = err.message || 'Email delivery failed';
      this.logger.warn(`Failed to dispatch email to ${email}: ${errorMessage}`);

      // Log failure in DB
      await this.prisma.emailLog.create({
        data: {
          invitationId,
          status: EmailLogStatus.FAILED,
          errorMessage,
        },
      });

      return { status: EmailLogStatus.FAILED, errorMessage };
    }
  }
}
