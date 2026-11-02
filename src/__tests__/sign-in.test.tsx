import { fireEvent, render, screen } from '@testing-library/react-native';

import { supabase } from '@/lib/supabase';

import SignInScreen from '@/app/sign-in';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));

const auth = supabase.auth as unknown as { signInWithOtp: jest.Mock; verifyOtp: jest.Mock };

async function submitEmail(email = ' Sam@Example.com ') {
  await render(<SignInScreen />);
  await fireEvent.changeText(screen.getByLabelText('Email address'), email);
  await fireEvent.press(screen.getByText('Send code'));
}

beforeEach(() => {
  jest.resetAllMocks();
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
});

it('does not send a code for an invalid email', async () => {
  await submitEmail('not-an-email');
  expect(auth.signInWithOtp).not.toHaveBeenCalled();
});

it('sends a code to the normalized email and asks for the code', async () => {
  await submitEmail();
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'sam@example.com' });
  expect(await screen.findByLabelText('Sign-in code')).toBeTruthy();
});

it('stays on the email step and shows why when sending fails', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });
  await submitEmail();
  expect(await screen.findByText(/Rate limit exceeded/)).toBeTruthy();
  expect(screen.queryByLabelText('Sign-in code')).toBeNull();
});

it('verifies the code against the email it was sent to', async () => {
  await submitEmail();
  await fireEvent.changeText(await screen.findByLabelText('Sign-in code'), '123456');
  await fireEvent.press(screen.getByText('Sign in'));
  expect(auth.verifyOtp).toHaveBeenCalledWith({
    email: 'sam@example.com',
    token: '123456',
    type: 'email',
  });
});

it('shows an error for a wrong code', async () => {
  auth.verifyOtp.mockResolvedValue({ error: { message: 'Token has expired or is invalid' } });
  await submitEmail();
  await fireEvent.changeText(await screen.findByLabelText('Sign-in code'), '000000');
  await fireEvent.press(screen.getByText('Sign in'));
  expect(await screen.findByText(/didn't work/)).toBeTruthy();
});

it('can go back and use a different email', async () => {
  await submitEmail();
  await fireEvent.press(await screen.findByText('Use a different email'));
  expect(await screen.findByLabelText('Email address')).toBeTruthy();
});
