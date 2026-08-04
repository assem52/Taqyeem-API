import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
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

  afterEach(() => {
    process.env.ADMIN_API_TOKEN = originalEnv;
  });

  it('SECURITY: fails closed when ADMIN_API_TOKEN is not configured at all — this is the exact scenario the previous guard got wrong', () => {
    delete process.env.ADMIN_API_TOKEN;
    const guard = new AdminGuard();
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects a request with no token when one is configured', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    const guard = new AdminGuard();
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects a request with the wrong token', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    const guard = new AdminGuard();
    expect(() =>
      guard.canActivate(buildContext({ 'x-admin-token': 'guessed-wrong' })),
    ).toThrow(UnauthorizedException);
  });

  it('allows a request with the correct token', () => {
    process.env.ADMIN_API_TOKEN = 'real-secret';
    const guard = new AdminGuard();
    expect(guard.canActivate(buildContext({ 'x-admin-token': 'real-secret' }))).toBe(true);
  });
});
