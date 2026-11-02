import { isValidCode, isValidEmail, isValidInviteCode, normalizeEmail } from './validation';

describe('normalizeEmail', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeEmail('  Sam@Example.COM ')).toBe('sam@example.com');
  });
});

describe('isValidEmail', () => {
  it.each(['sam@example.com', ' sam@example.co.uk '])('accepts %p', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'sam', 'sam@example', '@example.com', 'sam @example.com'])('rejects %p', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('isValidCode', () => {
  it('accepts exactly six digits', () => {
    expect(isValidCode('012345')).toBe(true);
  });

  it.each(['', '12345', '1234567', '12a456'])('rejects %p', (code) => {
    expect(isValidCode(code)).toBe(false);
  });
});

describe('isValidInviteCode', () => {
  it.each(['K7M2QXAB', ' k7m2qxab '])('accepts %p', (code) => {
    expect(isValidInviteCode(code)).toBe(true);
  });

  it.each(['', 'K7M2QXA', 'K7M2QXABC', 'K0M2QXAB', 'K1M2QXAB'])('rejects %p', (code) => {
    expect(isValidInviteCode(code)).toBe(false);
  });
});
