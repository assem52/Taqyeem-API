import { assertNoMockAuthInProduction } from './assert-safe-env';

describe('assertNoMockAuthInProduction', () => {
  it('SECURITY: throws when NODE_ENV=production and MOCK_STUDENT_ID is set', () => {
    expect(() =>
      assertNoMockAuthInProduction('production', '11111111-1111-1111-1111-111111111111'),
    ).toThrow(/MOCK_STUDENT_ID/);
  });

  it('does not throw in production when MOCK_STUDENT_ID is unset', () => {
    expect(() => assertNoMockAuthInProduction('production', undefined)).not.toThrow();
  });

  it('does not throw in development with MOCK_STUDENT_ID set — this is the normal local case', () => {
    expect(() =>
      assertNoMockAuthInProduction('development', '11111111-1111-1111-1111-111111111111'),
    ).not.toThrow();
  });

  it('does not throw when NODE_ENV is undefined entirely', () => {
    expect(() =>
      assertNoMockAuthInProduction(undefined, '11111111-1111-1111-1111-111111111111'),
    ).not.toThrow();
  });
});
