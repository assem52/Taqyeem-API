import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import { requireJwtSecret } from './jwt.config';

type JwtPayload = {
  sub: string;
  email?: string;
  role?: string;
};

/**
 * Runs after a Bearer token is verified cryptographically.
 * `validate()` return value becomes `request.user`.
 * We re-load the user from DB so studentId/role stay fresh if they change.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        studentId: true,
        name: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      studentId: user.studentId,
    };
  }
}
