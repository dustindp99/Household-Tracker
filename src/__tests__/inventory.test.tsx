import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react-native';

import InventoryScreen from '@/app/household/[id]';
import { getHousehold, listMembers } from '@/lib/households';
import { listCategories, listItems } from '@/lib/items';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: unknown }) => children,
  router: { push: jest.fn() },
  Stack: { Screen: () => null },
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
}));
jest.mock('@/lib/items', () => ({
  ...jest.requireActual('@/lib/items'),
  listCategories: jest.fn(),
  listItems: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

function testClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

async function renderAs(
  role: string | null,
  categories = [{ id: 'c1', name: 'Kitchen' }, { id: 'c2', name: 'Bathroom' }],
) {
  (getHousehold as jest.Mock).mockResolvedValue({ id: 'h1', name: 'Home' });
  (listMembers as jest.Mock).mockResolvedValue(role ? [{ user_id: 'me', role }] : []);
  (listCategories as jest.Mock).mockResolvedValue(categories);
  (listItems as jest.Mock).mockResolvedValue([
    { id: 'i1', category_id: 'c1', name: 'Eggs', tracking_type: 'counter', quantity: 6, in_stock: null },
    { id: 'i2', category_id: 'c1', name: 'Dish soap', tracking_type: 'yes_no', quantity: null, in_stock: false },
  ]);
  const client = testClient();
  await render(
    <QueryClientProvider client={client}>
      <InventoryScreen />
    </QueryClientProvider>,
  );
  return client;
}

it('groups items under their categories and shows their stock', async () => {
  await renderAs('viewer');
  expect(await screen.findByText('Kitchen')).toBeTruthy();
  expect(screen.getByText('Eggs')).toBeTruthy();
  expect(screen.getByText('6')).toBeTruthy();
  expect(screen.getByText('Dish soap')).toBeTruthy();
  expect(screen.getByText('No')).toBeTruthy();
  expect(screen.getByText('No items yet.')).toBeTruthy();
});

it.each(['owner', 'editor'])('lets a %s add and edit', async (role) => {
  await renderAs(role);
  expect(await screen.findByText('Add category')).toBeTruthy();
  expect(screen.getByText('Add item to Kitchen')).toBeTruthy();
  expect(screen.getByText('Edit Kitchen')).toBeTruthy();
});

it('gives a viewer no editing controls', async () => {
  await renderAs('viewer');
  await screen.findByText('Kitchen');
  expect(screen.queryByText('Add category')).toBeNull();
  expect(screen.queryByText('Add item to Kitchen')).toBeNull();
  expect(screen.queryByText('Edit Kitchen')).toBeNull();
});

it('prompts an editor to add the first category', async () => {
  await renderAs('editor', []);
  expect(await screen.findByText(/Add a category/)).toBeTruthy();
});

it('shows a removed member that they have lost access', async () => {
  await renderAs(null);
  expect(await screen.findByText(/no longer have access/)).toBeTruthy();
});

it('keeps showing items when a refresh fails', async () => {
  const client = await renderAs('viewer');
  await screen.findByText('Eggs');
  (listItems as jest.Mock).mockRejectedValue(new Error('Network request failed'));
  await act(() => client.refetchQueries({ queryKey: ['households', 'h1', 'items'] }));
  expect(screen.getByText('Eggs')).toBeTruthy();
  expect(screen.queryByText('Something went wrong.')).toBeNull();
});

it('shows an error when there is nothing to show', async () => {
  (listItems as jest.Mock).mockRejectedValue(new Error('Network request failed'));
  (getHousehold as jest.Mock).mockResolvedValue({ id: 'h1', name: 'Home' });
  (listMembers as jest.Mock).mockResolvedValue([{ user_id: 'me', role: 'viewer' }]);
  (listCategories as jest.Mock).mockResolvedValue([]);
  await render(
    <QueryClientProvider client={testClient()}>
      <InventoryScreen />
    </QueryClientProvider>,
  );
  expect(await screen.findByText('Something went wrong.')).toBeTruthy();
});
