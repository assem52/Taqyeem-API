import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

export type MailDeliveryMode = 'live' | 'simulated';

@Injectable()
export class MailTransportService implements OnModuleInit {
  private readonly logger = new Logger(MailTransportService.name);
  private transporter: Transporter | null = null;
  private mode: MailDeliveryMode = 'simulated';

  onModuleInit() {
    const host = process.env.SMTP_HOST?.trim();
    const forceLive = process.env.EMAIL_DELIVERY_ENABLED === 'true';

    if (host) {
      const port = Number(process.env.SMTP_PORT || 587);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              }
            : undefined,
      });
      this.mode = 'live';
      this.logger.log(`SMTP transport configured (${host}:${port}).`);
      return;
    }

    if (forceLive) {
      this.logger.warn(
        'EMAIL_DELIVERY_ENABLED=true but SMTP_HOST is missing — staying in simulated mode.',
      );
    } else {
      this.logger.warn(
        'Email delivery running in SIMULATED mode. Set SMTP_HOST for live delivery.',
      );
    }
    this.mode = 'simulated';
  }

  get deliveryMode(): MailDeliveryMode {
    return this.mode;
  }

  frontendBaseUrl(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      'http://localhost:5173'
    ).replace(/\/$/, '');
  }

  /**
   * Sends mail when live; logs clearly when simulated.
   * Returns whether the message was actually handed to SMTP.
   */
  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ delivered: boolean; simulated: boolean }> {
    if (this.mode === 'simulated' || !this.transporter) {
      this.logger.log(
        `[SIMULATED EMAIL] to=${options.to} subject="${options.subject}"\n${options.text}`,
      );
      return { delivered: false, simulated: true };
    }

    const from =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'noreply@taqyem.local';

    await this.transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text.replace(/\n/g, '<br/>'),
    });

    this.logger.log(`[LIVE EMAIL] to=${options.to} subject="${options.subject}"`);
    return { delivered: true, simulated: false };
  }
}
