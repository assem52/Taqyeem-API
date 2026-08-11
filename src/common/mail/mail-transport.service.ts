import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type Transporter from 'nodemailer/lib/mailer';

export type MailDeliveryMode = 'live' | 'simulated';

/** Accepts 1/0, true/false, yes/no, on/off. Unset → enabled when SMTP_HOST is set. */
export function isEmailDeliveryEnabled(
  raw: string | undefined = process.env.EMAIL_DELIVERY_ENABLED,
  smtpHost: string | undefined = process.env.SMTP_HOST,
): boolean {
  const flag = raw?.trim().toLowerCase();
  if (!flag) {
    return Boolean(smtpHost?.trim());
  }
  if (['0', 'false', 'no', 'off'].includes(flag)) {
    return false;
  }
  if (['1', 'true', 'yes', 'on'].includes(flag)) {
    return true;
  }
  return Boolean(smtpHost?.trim());
}

@Injectable()
export class MailTransportService implements OnModuleInit {
  private readonly logger = new Logger(MailTransportService.name);
  private transporter: Transporter | null = null;
  private mode: MailDeliveryMode = 'simulated';
  private mode: MailDeliveryMode = 'simulated';

  onModuleInit() {
    const host = process.env.SMTP_HOST?.trim();
    const deliveryEnabled = isEmailDeliveryEnabled();

    if (host && deliveryEnabled) {
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
        // Prevent register/login UX from hanging when SMTP is blocked/unreachable.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      this.mode = 'live';
      this.logger.log(`SMTP transport configured (${host}:${port}).`);
      return;
    }

    this.mode = 'simulated';
    if (host && !deliveryEnabled) {
      this.logger.warn(
        'Email delivery running in SIMULATED mode (EMAIL_DELIVERY_ENABLED=0). SMTP_* kept but no messages are sent.',
      );
      return;
    }
    if (deliveryEnabled && !host) {
      this.logger.warn(
        'EMAIL_DELIVERY_ENABLED=1 but SMTP_HOST is missing — staying in simulated mode.',
      );
      return;
    }
    this.logger.warn(
      'Email delivery running in SIMULATED mode. Set SMTP_HOST and EMAIL_DELIVERY_ENABLED=1 for live delivery.',
    );
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
