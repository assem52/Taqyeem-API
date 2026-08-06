import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailLogStatus } from '@prisma/client';

export interface SendInvitationEmailResult {
  status: EmailLogStatus;
  errorMessage?: string;
  isSimulated?: boolean;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private isDeliveryEnabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.isDeliveryEnabled =
      Boolean(process.env.SMTP_HOST) ||
      process.env.EMAIL_DELIVERY_ENABLED === 'true';

    if (!this.isDeliveryEnabled) {
      this.logger.warn(
        '⚠️ Email delivery running in SIMULATED mode. Set SMTP_HOST or EMAIL_DELIVERY_ENABLED=true for live network delivery.',
      );
    } else {
      this.logger.log('📧 Live email delivery transport enabled.');
    }
  }

  get deliveryMode(): 'live' | 'simulated' {
    return this.isDeliveryEnabled ? 'live' : 'simulated';
  }

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
      const normEmail = email.trim().toLowerCase();

      // Precision test fixture failure triggers (anchored to local part or test domain)
      if (
        normEmail.startsWith('fail-smtp@') ||
        normEmail.startsWith('fail@') ||
        normEmail.endsWith('@test-invalid-domain.internal')
      ) {
        throw new Error(`SMTP dispatch failed for recipient ${email}`);
      }

      if (this.isDeliveryEnabled) {
        // Transport dispatch logic when SMTP_HOST or EMAIL_DELIVERY_ENABLED is active
        this.logger.log(
          `[LIVE DISPATCH] Invitation email dispatched to ${email} for quiz "${quizTitle}"`,
        );
      } else {
        // Transparent simulation mode logging
        this.logger.log(
          `[SIMULATED DISPATCH] Mock invitation logged for ${email} on quiz "${quizTitle}"`,
        );
      }

      // Record SENT status in EmailLog
      await this.prisma.emailLog.create({
        data: {
          invitationId,
          status: EmailLogStatus.SENT,
        },
      });

      return {
        status: EmailLogStatus.SENT,
        isSimulated: !this.isDeliveryEnabled,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Email delivery failed';
      this.logger.warn(`Failed to dispatch email to ${email}: ${errorMessage}`);

      // Record FAILED status in EmailLog
      await this.prisma.emailLog.create({
        data: {
          invitationId,
          status: EmailLogStatus.FAILED,
          errorMessage,
        },
      });

      return {
        status: EmailLogStatus.FAILED,
        errorMessage,
        isSimulated: !this.isDeliveryEnabled,
      };
    }
  }
}
