import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Dual-mode admin access:
 * 1) Prefer Authorization: Bearer <jwt> with role === ADMIN
 * 2) Fall back to x-admin-token === ADMIN_API_TOKEN (dev / transitional)
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (
      typeof authHeader === 'string' &&
      authHeader.toLowerCase().startsWith('bearer ')
    ) {
      const token = authHeader.slice(7).trim();
      try {
        const payload = this.jwtService.verify<{
          sub: string;
          email?: string;
          role?: string;
        }>(token);

        if (payload.role !== 'ADMIN') {
          throw new ForbiddenException('Admin role required.');
        }

        request.user = {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
          via: 'jwt',
        };
        return true;
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        throw new UnauthorizedException('Invalid or expired token.');
      }
    }

    const providedToken = request.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_API_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException(
        'Admin access is not configured. Log in as ADMIN or set ADMIN_API_TOKEN.',
      );
    }

    const provided = Buffer.from(String(providedToken ?? ''));
    const expected = Buffer.from(expectedToken);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException('Invalid admin token.');
    }

    request.user = {
      userId: null,
      role: 'ADMIN',
      via: 'admin-token',
    };
    return true;
  }
}
