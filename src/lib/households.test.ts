import { errorMessage, inviteLink, inviteMessage } from './households';

jest.mock('./supabase', () => ({ supabase: {} }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `householdtracker://${path}` }));

describe('errorMessage', () => {
  it('explains known database errors', () => {
    expect(errorMessage({ message: 'owner_cannot_leave' })).toMatch(/Transfer ownership/);
  });

  it('explains a duplicate name', () => {
    expect(errorMessage({ code: '23505', message: 'duplicate key' })).toMatch(/already in use/);
  });

  it('falls back to a generic message without exposing internals', () => {
    expect(errorMessage(new Error('duplicate key value violates constraint'))).toMatch(/try again/);
  });
});

describe('inviteLink', () => {
  it('uses the website when one is configured', () => {
    expect(inviteLink('K7M2QXAB', 'https://example.com/')).toBe('https://example.com/join/K7M2QXAB');
  });

  it('falls back to the app link', () => {
    expect(inviteLink('K7M2QXAB', '')).toBe('householdtracker://join/K7M2QXAB');
  });
});

it('puts both the link and the code in the invite message', () => {
  const message = inviteMessage('Home', 'K7M2QXAB', 'https://example.com/join/K7M2QXAB');
  expect(message).toContain('https://example.com/join/K7M2QXAB');
  expect(message).toContain('K7M2QXAB');
  expect(message).toContain('Home');
});
