import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, name } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { message: 'If this email can be registered, you will receive a confirmation.' };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiration

    await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'STUDENT',
        status: 'UNVERIFIED',
        verificationToken,
        tokenExpiresAt,
      },
    });

    console.log(`Verification Link: /auth/verify?email=${email}&token=${verificationToken}`);

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const { email, token } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'VERIFIED') {
      return { message: 'Email is already verified.' };
    }

    if (user.verificationToken !== token) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        status: 'VERIFIED',
        verificationToken: null,
        tokenExpiresAt: null,
      },
    });

    return { message: 'Email successfully verified. You can now take quizzes.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === 'VERIFIED') {
      return { message: 'Email is already verified.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { email },
      data: {
        verificationToken,
        tokenExpiresAt,
      },
    });

    console.log(`Resend Verification Link: /auth/verify?email=${email}&token=${verificationToken}`);

    return { message: 'Verification email resent successfully.' };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: user.id, email: user.email, role: user.role, status: user.status };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      status: user.status,
      message: user.status === 'UNVERIFIED' ? 'Account is unverified. You cannot take quizzes until verified.' : 'Login successful',
    };
  }
}