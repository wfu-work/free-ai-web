import { effectiveAccountStatus } from './account-status.util';

describe('effectiveAccountStatus', () => {
  it('maps legacy available accounts with failed refresh to invalid', () => {
    expect(effectiveAccountStatus('available', 'refresh_failed')).toBe('invalid');
    expect(effectiveAccountStatus('available', 'invalid')).toBe('invalid');
  });

  it('preserves temporary health states but prioritizes invalid credentials', () => {
    expect(effectiveAccountStatus('limited', 'refresh_failed')).toBe('limited');
    expect(effectiveAccountStatus('disabled', 'invalid')).toBe('disabled');
    expect(effectiveAccountStatus('unknown', 'refresh_failed')).toBe('unknown');
    expect(effectiveAccountStatus('unknown', 'invalid')).toBe('invalid');
    expect(effectiveAccountStatus('limited', 'invalid')).toBe('invalid');
  });

  it('keeps active and refresh-needed tokens available', () => {
    expect(effectiveAccountStatus('available', 'active')).toBe('available');
    expect(effectiveAccountStatus('available', 'refresh_needed')).toBe('available');
  });
});
