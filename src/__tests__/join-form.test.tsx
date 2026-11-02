import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { JoinForm } from '@/components/JoinForm';
import { errorMessage, joinHousehold } from '@/lib/households';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@/lib/households', () => ({ joinHousehold: jest.fn(), errorMessage: jest.fn() }));

async function renderForm(initialCode?: string) {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
      <JoinForm initialCode={initialCode} />
    </QueryClientProvider>,
  );
}

beforeEach(() => jest.resetAllMocks());

it('prefills and normalizes a code from an invite link', async () => {
  await renderForm('k7m2qxab');
  expect(screen.getByLabelText('Invite code').props.value).toBe('K7M2QXAB');
});

it('needs a valid code and a name before joining', async () => {
  await renderForm('BAD');
  await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
  await fireEvent.press(screen.getByText('Join household'));
  expect(joinHousehold).not.toHaveBeenCalled();
});

it('joins and opens the household', async () => {
  (joinHousehold as jest.Mock).mockResolvedValue('household-1');
  await renderForm('K7M2QXAB');
  await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
  await fireEvent.press(screen.getByText('Join household'));
  expect(joinHousehold).toHaveBeenCalledWith('K7M2QXAB', 'Sam');
  expect(router.replace).toHaveBeenCalledWith('/household/household-1');
});

it('shows why joining failed', async () => {
  (joinHousehold as jest.Mock).mockRejectedValue(new Error('invalid_invite'));
  (errorMessage as jest.Mock).mockReturnValue('That invite is not valid.');
  await renderForm('K7M2QXAB');
  await fireEvent.changeText(screen.getByLabelText('Your name'), 'Sam');
  await fireEvent.press(screen.getByText('Join household'));
  expect(await screen.findByText('That invite is not valid.')).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
});
