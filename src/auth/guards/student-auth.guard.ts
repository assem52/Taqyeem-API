import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { isProductionEnv } from '../../assert-safe-env';

/**
 * Dual-mode student identity:
 * 1) Prefer Authorization: Bearer <jwt> (must resolve to a linked studentId)
 * 2) Fall back to x-student-id / MOCK_STUDENT_ID **only outside production**
 */
@Injectable()
export class StudentAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;
    const hasBearer =
      typeof authHeader === 'string' &&
      authHeader.toLowerCase().startsWith('bearer ');

    if (hasBearer) {
      const activated = await this.toPromise(super.canActivate(context));
      if (!activated) {
        return false;
      }
      if (request.user?.role === 'ADMIN') {
        throw new UnauthorizedException(
          'This area is for learners only. Sign in with a student account.',
        );
      }
      if (!request.user?.studentId) {
        throw new UnauthorizedException(
          'This account is not linked to a student profile.',
        );
      }
      return true;
    }

    if (isProductionEnv(process.env.NODE_ENV)) {
      throw new UnauthorizedException(
        'Missing or invalid credentials. Sign in as a learner.',
      );
    }

    const resolvedStudentId =
      request.headers?.['x-student-id'] ?? process.env.MOCK_STUDENT_ID;

    if (!resolvedStudentId) {
      throw new UnauthorizedException(
        'Missing student identity. Log in, or send x-student-id / set MOCK_STUDENT_ID in development.',
      );
    }

    request.user = {
      userId: null,
      role: 'STUDENT',
      studentId: resolvedStudentId,
      via: 'mock-header',
    };
    return true;
  }

  private toPromise(
    value: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (typeof (value as Promise<boolean>)?.then === 'function') {
      return value as Promise<boolean>;
    }
    if (typeof (value as Observable<boolean>)?.subscribe === 'function') {
      return new Promise((resolve, reject) => {
        (value as Observable<boolean>).subscribe({
          next: resolve,
          error: reject,
          complete: () => undefined,
        });
      });
    }
    return Promise.resolve(Boolean(value));
  }
}
