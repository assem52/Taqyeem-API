import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailTransportService } from '../common/mail/mail-transport.service';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, password reset instructions have been sent.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailTransportService,
  ) {}

  /**
   * Register creates BOTH a Student (quiz domain) and a User (auth domain),
   * linked by User.studentId. If a Student already exists for that email
   * (e.g. from seed/invite flow), we reuse it instead of duplicating.
   */
  async register(dto: RegisterDto) {
    const email = normalizeEmail(dto.email);

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.$transaction(async (tx) => {
      let student = await tx.student.findUnique({ where: { email } });

      if (!student) {
        student = await tx.student.create({
          data: {
            name: dto.name,
            email,
            status: 'UNVERIFIED',
          },
        });
      }

      const created = await tx.user.create({
        data: {
          name: dto.name,
          email,
          password: hashedPassword,
          role: 'STUDENT',
          status: 'UNVERIFIED',
          verificationToken,
          tokenExpiresAt,
          studentId: student.id,
        },
      });

      await this.enrollFromPendingInvites(tx, student.id, email);
      return created;
    });

    await this.sendVerificationEmail(user.email, verificationToken);

    return {
      message: 'Registration successful. Please verify your email.',
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // JWT payload stays small; studentId is also returned in the body for routing.
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      role: user.role,
      status: user.status,
      studentId: user.studentId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        studentId: user.studentId,
      },
      message:
        user.status === 'UNVERIFIED'
          ? 'Your account is unverified. Please verify your email to access quizzes.'
          : 'Login successful.',
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        studentId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return user;
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        verificationToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token or email.');
    }

    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      throw new BadRequestException('Verification token has expired.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'VERIFIED',
          verificationToken: null,
          tokenExpiresAt: null,
        },
      });

      // Keep Student.status in sync — student quiz access checks Student.status.
      if (user.studentId) {
        await tx.student.update({
          where: { id: user.studentId },
          data: { status: 'VERIFIED' },
        });
        await this.enrollFromPendingInvites(tx, user.studentId, email);
      }
    });

    return { message: 'Email verified successfully.' };
  }

  /** Access contract: matching invite email → Enrollment on register/verify. */
  private async enrollFromPendingInvites(
    tx: Prisma.TransactionClient,
    studentId: string,
    email: string,
  ): Promise<void> {
    const invitations = await tx.invitation.findMany({
      where: {
        email: normalizeEmail(email),
        quiz: { status: 'PUBLISHED' },
      },
      select: { quizId: true },
    });

    const quizIds = [...new Set(invitations.map((row) => row.quizId))];
    for (const quizId of quizIds) {
      try {
        await tx.enrollment.create({ data: { quizId, studentId } });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.status === 'VERIFIED') {
      return {
        message:
          'If that account exists and needs verification, a new link has been sent.',
      };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        tokenExpiresAt,
      },
    });

    await this.sendVerificationEmail(email, verificationToken);

    return {
      message:
        'If that account exists and needs verification, a new link has been sent.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const passwordResetToken = crypto.randomBytes(32).toString('hex');
      const passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken,
          passwordResetExpiresAt,
        },
      });

      const resetUrl = `${this.mail.frontendBaseUrl()}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(passwordResetToken)}`;
      await this.mail.sendMail({
        to: email,
        subject: 'Reset your Taqyem password',
        text: [
          'Reset your password using this link:',
          resetUrl,
          '',
          'This link expires in 1 hour. If you did not request a reset, ignore this email.',
        ].join('\n'),
      });
    }

    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  private async sendVerificationEmail(email: string, token: string) {
    const verifyUrl = `${this.mail.frontendBaseUrl()}/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    await this.mail.sendMail({
      to: email,
      subject: 'Verify your Taqyem email',
      text: [
        'Welcome to Taqyem. Verify your email to access quizzes:',
        verifyUrl,
        '',
        `Or enter this token on the verify page: ${token}`,
      ].join('\n'),
    });
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        passwordResetToken: dto.token,
      },
    });

    if (
      !user ||
      !user.passwordResetExpiresAt ||
      new Date() > user.passwordResetExpiresAt
    ) {
      throw new BadRequestException(
        'Invalid or expired password reset token.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Password updated. You can sign in with your new password.' };
  }
}
