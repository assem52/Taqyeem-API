import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
@Injectable()
class AuthService {
  constructor(private prisma: PrismaService) {}

  async register(dto: RegisterDto) {

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }


    const hashedPassword = await bcrypt.hash(dto.password, 10);

  
    const userName = (dto as any).name ?? dto.email.split('@')[0];

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: userName,
        role: Role.STUDENT,
      },
    });


    const { password, ...result } = user;
    return result;
  }

  async login(dto: LoginDto) {

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

  
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password, ...result } = user;
    return {
      message: 'Logged in successfully',
      user: result,
    };
  }
}
export { AuthService };