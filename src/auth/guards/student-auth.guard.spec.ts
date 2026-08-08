import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { StudentAuthGuard } from './student-auth.guard';

function buildContext(headers: Record<string, string>): ExecutionContext {
  const request = { headers, user: undefined as unknown };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getRequest: () => request,
  } as unknown as ExecutionContext;
}

describe('StudentAuthGuard', () => {
  const originalMock = process.env.MOCK_STUDENT_ID;
  let guard: StudentAuthGuard;

  beforeEach(() => {
    guard = new StudentAuthGuard();
  });

  afterEach(() => {
    process.env.MOCK_STUDENT_ID = originalMock;
  });

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
