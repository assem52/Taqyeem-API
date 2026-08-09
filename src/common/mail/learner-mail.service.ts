import { Injectable, Logger } from '@nestjs/common';
import { MailTransportService } from './mail-transport.service';

@Injectable()
export class LearnerMailService {
  private readonly logger = new Logger(LearnerMailService.name);

  constructor(private readonly mail: MailTransportService) {}

  async sendRegistrationVerification(
    email: string,
    token: string,
    opts?: { devEscapeCode?: string },
  ): Promise<{ delivered: boolean; simulated: boolean }> {
    const verifyUrl = `${this.mail.frontendBaseUrl()}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const lines = [
      'Welcome to Taqyem!',
      '',
      'Thanks for registering. Enter this verification code to activate your account:',
      '',
      `  Code: ${token}`,
      '',
    ];

    if (opts?.devEscapeCode) {
      lines.push(
        `(Development escape code ${opts.devEscapeCode} also works if you cannot open this email.)`,
        '',
      );
    }

    lines.push(
      'Or open this link:',
      verifyUrl,
      '',
      'If you did not create this account, you can ignore this email.',
    );

    try {
      return await this.mail.sendMail({
        to: email,
        subject: 'Welcome to Taqyem — your verification code',
        text: lines.join('\n'),
      });
    } catch (error: any) {
      // Account creation must not 500 when SMTP rejects the recipient
      // (e.g. Resend test mode only allows the account owner's address).
      this.logger.warn(
        `Failed to send verification email to ${email}: ${error?.message || error}`,
      );
      return { delivered: false, simulated: false };
    }
  }

  async sendQuizCompleted(options: {
    email: string;
    learnerName?: string | null;
    quizTitle: string;
    quizId: string;
    percentage: number;
    passed: boolean | null;
    autoSubmitted?: boolean;
  }): Promise<void> {
    const {
      email,
      learnerName,
      quizTitle,
      quizId,
      percentage,
      passed,
      autoSubmitted,
    } = options;

    const resultsUrl = `${this.mail.frontendBaseUrl()}/quizzes/${quizId}/results`;
    const greeting = learnerName?.trim() ? `Hi ${learnerName.trim()},` : 'Hi,';
    const passLine =
      passed === true
        ? 'Result: Passed'
        : passed === false
          ? 'Result: Not yet passed'
          : 'Result: Score recorded';

    try {
      await this.mail.sendMail({
        to: email,
        subject: autoSubmitted
          ? `Quiz auto-submitted: ${quizTitle}`
          : `Quiz completed: ${quizTitle}`,
        text: [
          greeting,
          '',
          autoSubmitted
            ? `Your attempt for "${quizTitle}" was submitted automatically when time ran out.`
            : `You finished "${quizTitle}" on Taqyem.`,
          '',
          `Score: ${percentage}%`,
          passLine,
          '',
          `View your results: ${resultsUrl}`,
          '',
          '— Taqyem',
        ].join('\n'),
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to send quiz-completed email to ${email}: ${error?.message || error}`,
      );
    }
  }
}
