import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminGuard } from './admin.guard';

function buildContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const originalEnv = process.env.ADMIN_API_TOKEN;
  let jwtService: { verify: jest.Mock };
  let guard: AdminGuard;

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    guard = new AdminGuard(jwtService as unknown as JwtService);
  });

  afterEach(() => {
    process.env.ADMIN_API_TOKEN = originalEnv;
  });

  it('SECURITY: fails closed when ADMIN_API_TOKEN is not configured and no Bearer token', () => {
    delete process.env.ADMIN_API_TOKEN;
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with no token when one is configured', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a request with the wrong token', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    expect(() =>
      guard.canActivate(buildContext({ 'x-admin-token': 'guessed-wrong' })),
    ).toThrow(UnauthorizedException);
  });

  it('allows a request with the correct shared secret', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    expect(
      guard.canActivate(buildContext({ 'x-admin-token': 'real-secret' })),
    ).toBe(true);
  });

  it('allows a Bearer JWT with ADMIN role', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });
    expect(
      guard.canActivate(
        buildContext({ authorization: 'Bearer valid.jwt.token' }),
      ),
    ).toBe(true);
  });

  it('rejects a Bearer JWT without ADMIN role', () => {
    jwtService.verify.mockReturnValue({
      sub: 'user-2',
      email: 'student@example.com',
      role: 'STUDENT',
    });
    expect(() =>
      guard.canActivate(
        buildContext({ authorization: 'Bearer student.jwt.token' }),
      ),
    ).toThrow(ForbiddenException);
  });
});
