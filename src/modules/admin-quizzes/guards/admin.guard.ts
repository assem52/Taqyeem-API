import { timingSafeEqual } from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedToken = request.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_API_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException('Admin access is not configured.');
    }

    const provided = Buffer.from(String(providedToken ?? ''));
    const expected = Buffer.from(expectedToken);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException('Invalid admin token.');
    }

    return true;
  }
}