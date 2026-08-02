import { assertNoMockAuthInProduction } from './assert-safe-env';

describe('assertNoMockAuthInProduction', () => {
  it('SECURITY: throws when NODE_ENV=production and MOCK_STUDENT_ID is set', () => {
    expect(() =>
      assertNoMockAuthInProduction({
        NODE_ENV: 'production',
        MOCK_STUDENT_ID: '11111111-1111-1111-1111-111111111111',
      }),
    ).toThrow(/MOCK_STUDENT_ID/);
  });

  it('does not throw in production when MOCK_STUDENT_ID is unset', () => {
    expect(() =>
      assertNoMockAuthInProduction({ NODE_ENV: 'production' }),
    ).not.toThrow();
  });

  it('does not throw in development with MOCK_STUDENT_ID set — this is the normal local case', () => {
    expect(() =>
      assertNoMockAuthInProduction({
        NODE_ENV: 'development',
        MOCK_STUDENT_ID: '11111111-1111-1111-1111-111111111111',
      }),
    ).not.toThrow();
  });

  it('does not throw when NODE_ENV is unset entirely', () => {
    expect(() =>
      assertNoMockAuthInProduction({ MOCK_STUDENT_ID: '11111111-1111-1111-1111-111111111111' }),
    ).not.toThrow();
  });
});
