import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import HouseholdScreen from '@/app/household/[id]/settings';
import { getHousehold, listMembers, listPendingInvites } from '@/lib/households';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useFocusEffect: jest.fn(),
  useLocalSearchParams: () => ({ id: 'h1' }),
}));
jest.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'me' } } }),
}));
jest.mock('@/lib/households', () => ({
  errorMessage: () => 'Something went wrong.',
  getHousehold: jest.fn(),
  listMembers: jest.fn(),
  listPendingInvites: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

function member(id: string, userId: string, role: string) {
  return { id, user_id: userId, role, display_name: id, household_id: 'h1', joined_at: '' };
}

async function renderAs(role: string) {
  (getHousehold as jest.Mock).mockResolvedValue({ id: 'h1', name: 'Home' });
  (listPendingInvites as jest.Mock).mockResolvedValue([]);
  (listMembers as jest.Mock).mockResolvedValue(
    role === 'owner'
      ? [member('Me', 'me', 'owner'), member('Ben', 'ben', 'editor')]
      : [member('Olive', 'olive', 'owner'), member('Me', 'me', role)],
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <HouseholdScreen />
    </QueryClientProvider>,
  );
  await screen.findByText(/Me \(you\)/);
}

it('gives the owner management controls but no way to leave', async () => {
  await renderAs('owner');
  expect(screen.getByText('Invite an editor')).toBeTruthy();
  expect(screen.getByText('Make owner')).toBeTruthy();
  expect(screen.getByText('Remove')).toBeTruthy();
  expect(screen.getByText('Delete household')).toBeTruthy();
  expect(screen.queryByText('Leave household')).toBeNull();
});

it.each(['editor', 'viewer'])('limits a %s to leaving and their own name', async (role) => {
  await renderAs(role);
  expect(screen.getByText('Leave household')).toBeTruthy();
  expect(screen.getByLabelText('Your name in this household')).toBeTruthy();
  expect(screen.queryByText('Invite an editor')).toBeNull();
  expect(screen.queryByText('Remove')).toBeNull();
  expect(screen.queryByText('Delete household')).toBeNull();
  expect(screen.queryByLabelText('Household name')).toBeNull();
  expect(listPendingInvites).not.toHaveBeenCalled();
});
