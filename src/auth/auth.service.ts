import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email is already in use.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: 'STUDENT',
        status: 'UNVERIFIED',
        verificationToken,
        tokenExpiresAt,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `[DEV] Verification link for ${user.email}: /auth/verify?token=${verificationToken}`,
      );
    }

    return {
      message: 'Registration successful. Please verify your email.',
      email: user.email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      status: user.status,
      message:
        user.status === 'UNVERIFIED'
          ? 'Your account is unverified. Please verify your email to access quizzes.'
          : 'Login successful.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        verificationToken: dto.token,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token or email.');
    }

    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      throw new BadRequestException('Verification token has expired.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'VERIFIED',
        verificationToken: null,
        tokenExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `[DEV] New verification link for ${dto.email}: /auth/verify?token=${verificationToken}`,
      );
    }

    return {
      message:
        'If that account exists and needs verification, a new link has been sent.',
    };
  }
}