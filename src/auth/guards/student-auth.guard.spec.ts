import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { StudentAuthGuard } from './student-auth.guard';

function buildContext(
  headers: Record<string, string>,
  user?: any,
): ExecutionContext {
  const request = { headers, user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getRequest: () => request,
  } as unknown as ExecutionContext;
}

describe('StudentAuthGuard', () => {
  const originalMock = process.env.MOCK_STUDENT_ID;
  const originalEnv = process.env.NODE_ENV;
  let guard: StudentAuthGuard;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    guard = new StudentAuthGuard();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.MOCK_STUDENT_ID = originalMock;
    process.env.NODE_ENV = originalEnv;
  });

  describe('Development / Test environment fallback (NODE_ENV !== production)', () => {
    it('falls back to MOCK_STUDENT_ID when no Bearer token is present', async () => {
      process.env.MOCK_STUDENT_ID = '11111111-1111-1111-1111-111111111111';
      const ctx = buildContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(ctx.switchToHttp().getRequest().user.studentId).toBe(
        '11111111-1111-1111-1111-111111111111',
      );
    });

    it('uses x-student-id header over MOCK_STUDENT_ID', async () => {
      process.env.MOCK_STUDENT_ID = '11111111-1111-1111-1111-111111111111';
      const ctx = buildContext({
        'x-student-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(ctx.switchToHttp().getRequest().user.studentId).toBe(
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      );
    });

    it('rejects when neither Bearer nor mock identity is available', async () => {
      delete process.env.MOCK_STUDENT_ID;
      await expect(guard.canActivate(buildContext({}))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Production security enforcement (NODE_ENV=production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('SECURITY EXPLOIT TEST: rejects x-student-id header without Authorization in production', async () => {
      const ctx = buildContext({
        'x-student-id': 'attacker-target-student-uuid',
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('SECURITY EXPLOIT TEST: rejects MOCK_STUDENT_ID env without Authorization in production', async () => {
      process.env.MOCK_STUDENT_ID = 'target-student-uuid';
      const ctx = buildContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects request with no Authorization header in production', async () => {
      delete process.env.MOCK_STUDENT_ID;
      const ctx = buildContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('JWT Bearer Token Flow', () => {
    it('authenticates request when valid Bearer token resolves user with studentId', async () => {
      const mockSuperCanActivate = jest
        .spyOn(Object.getPrototypeOf(StudentAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const ctx = buildContext(
        { authorization: 'Bearer valid.jwt.token' },
        { userId: 'u1', studentId: 's1', role: 'STUDENT' },
      );

      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(mockSuperCanActivate).toHaveBeenCalledWith(ctx);

      mockSuperCanActivate.mockRestore();
    });

    it('rejects request when Bearer token user has no linked studentId', async () => {
      const mockSuperCanActivate = jest
        .spyOn(Object.getPrototypeOf(StudentAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(true);

      const ctx = buildContext(
        { authorization: 'Bearer valid.jwt.token' },
        { userId: 'u1', studentId: null, role: 'STUDENT' },
      );

      await expect(guard.canActivate(ctx)).rejects.toThrow(
        UnauthorizedException,
      );

      mockSuperCanActivate.mockRestore();
    });

    it('rejects request when super.canActivate returns false (invalid/expired JWT)', async () => {
      const mockSuperCanActivate = jest
        .spyOn(Object.getPrototypeOf(StudentAuthGuard.prototype), 'canActivate')
        .mockResolvedValue(false);

      const ctx = buildContext({ authorization: 'Bearer invalid.jwt.token' });

      await expect(guard.canActivate(ctx)).resolves.toBe(false);

      mockSuperCanActivate.mockRestore();
    });
  });

  it('rejects mock identity headers in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.MOCK_STUDENT_ID = '11111111-1111-1111-1111-111111111111';
    await expect(
      guard.canActivate(
        buildContext({
          'x-student-id': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });
});
