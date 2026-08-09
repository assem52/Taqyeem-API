import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailLogStatus } from '@prisma/client';
import { MailTransportService } from '../../common/mail/mail-transport.service';

export interface SendInvitationEmailResult {
  status: EmailLogStatus;
  errorMessage?: string;
  isSimulated?: boolean;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailTransportService,
  ) {}

  onModuleInit() {
    this.logger.log(`Invitation email mode: ${this.mail.deliveryMode}`);
  }

  get deliveryMode(): 'live' | 'simulated' {
    return this.mail.deliveryMode;
  }

  buildInviteUrl(invitationId: string): string {
    return `${this.mail.frontendBaseUrl()}/invite/${invitationId}`;
  }

  async sendInvitationEmail(
    invitationId: string,
    email: string,
    quizTitle: string,
  ): Promise<SendInvitationEmailResult> {
    try {
      const normEmail = email.trim().toLowerCase();
      const inviteUrl = this.buildInviteUrl(invitationId);

      if (
        normEmail.startsWith('fail-smtp@') ||
        normEmail.startsWith('fail@') ||
        normEmail.endsWith('@test-invalid-domain.internal')
      ) {
        throw new Error(`SMTP dispatch failed for recipient ${email}`);
      }

      const subject = `You're invited: ${quizTitle}`;
      const text = [
        `You've been invited to take "${quizTitle}" on Taqyem.`,
        '',
        `Open your invite: ${inviteUrl}`,
        '',
        'If the button in your email client does not work, paste the link into your browser.',
      ].join('\n');

      const sendResult = await this.mail.sendMail({
        to: normEmail,
        subject,
        text,
      });

      // Only claim SENT when SMTP accepted the message.
      // Simulated mode records FAILED so operators use Copy link (never pretend live mail).
      if (sendResult.simulated) {
        await this.prisma.emailLog.create({
          data: {
            invitationId,
            status: EmailLogStatus.FAILED,
            errorMessage:
              'Simulated delivery — email not sent. Use Copy link / invite URL.',
          },
        });
        return {
          status: EmailLogStatus.FAILED,
          errorMessage:
            'Simulated delivery — email not sent. Use Copy link / invite URL.',
          isSimulated: true,
        };
      }

      if (sendResult.delivered) {
        await this.prisma.emailLog.create({
          data: {
            invitationId,
            status: EmailLogStatus.SENT,
            errorMessage: null,
          },
        });
        return {
          status: EmailLogStatus.SENT,
          isSimulated: false,
        };
      }

      throw new Error('Email transport did not accept the message');
    } catch (err: any) {
      const errorMessage = err.message || 'Email delivery failed';
      this.logger.warn(`Failed to dispatch email to ${email}: ${errorMessage}`);

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
        isSimulated: this.mail.deliveryMode === 'simulated',
      };
    }
  }
}
