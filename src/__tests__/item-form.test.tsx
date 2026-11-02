import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import ItemScreen from '@/app/household/[id]/item';
import { createItem, listCategories, listItems, updateItem } from '@/lib/items';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/households', () => ({ errorMessage: () => 'That name is already in use.' }));
jest.mock('@/lib/items', () => ({
  ...jest.requireActual('@/lib/items'),
  createItem: jest.fn(),
  deleteItem: jest.fn(),
  listCategories: jest.fn(),
  listItems: jest.fn(),
  updateItem: jest.fn(),
}));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const eggs = {
  id: 'i1',
  category_id: 'c1',
  name: 'Eggs',
  tracking_type: 'counter',
  quantity: 6,
  in_stock: null,
  low_threshold: 2,
};

async function renderScreen(params: Record<string, string>) {
  mockParams = { id: 'h1', ...params };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  await render(
    <QueryClientProvider client={client}>
      <ItemScreen />
    </QueryClientProvider>,
  );
  await screen.findByLabelText('Item name');
}

beforeEach(() => {
  jest.clearAllMocks();
  (listCategories as jest.Mock).mockResolvedValue([
    { id: 'c1', name: 'Kitchen' },
    { id: 'c2', name: 'Bathroom' },
  ]);
  (listItems as jest.Mock).mockResolvedValue([eggs]);
  (createItem as jest.Mock).mockResolvedValue(undefined);
  (updateItem as jest.Mock).mockResolvedValue(undefined);
});

it('creates an empty counter by default', async () => {
  await renderScreen({ categoryId: 'c1' });
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Milk');
  await fireEvent.press(screen.getByText('Save'));
  expect(createItem).toHaveBeenCalledWith({
    household_id: 'h1',
    category_id: 'c1',
    name: 'Milk',
    tracking_type: 'counter',
    quantity: 0,
    in_stock: null,
    low_threshold: null,
  });
  expect(router.back).toHaveBeenCalled();
});

it('creates a yes/no item that is out of stock', async () => {
  await renderScreen({ categoryId: 'c2' });
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Dish soap');
  await fireEvent.press(screen.getByText('Yes/No'));
  await fireEvent.press(screen.getByText("No, we're out"));
  await fireEvent.press(screen.getByText('Save'));
  expect(createItem).toHaveBeenCalledWith(
    expect.objectContaining({
      category_id: 'c2',
      tracking_type: 'yes_no',
      quantity: null,
      in_stock: false,
      low_threshold: null,
    }),
  );
});

it.each([
  ['Quantity', 'six'],
  ['Low threshold', '0'],
])('refuses to save with an invalid %s', async (label, value) => {
  await renderScreen({ categoryId: 'c1' });
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Milk');
  await fireEvent.changeText(screen.getByLabelText(label), value);
  await fireEvent.press(screen.getByText('Save'));
  expect(createItem).not.toHaveBeenCalled();
});

it('leaves stock out of the update when only the name changed', async () => {
  await renderScreen({ itemId: 'i1' });
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Free-range eggs');
  await fireEvent.press(screen.getByText('Save'));
  expect(updateItem).toHaveBeenCalledWith('i1', {
    name: 'Free-range eggs',
    category_id: 'c1',
    low_threshold: 2,
  });
});

it('includes the quantity when it was edited, and can move categories', async () => {
  await renderScreen({ itemId: 'i1' });
  await fireEvent.changeText(screen.getByLabelText('Quantity'), '12');
  await fireEvent.press(screen.getByText('Bathroom'));
  await fireEvent.press(screen.getByText('Save'));
  expect(updateItem).toHaveBeenCalledWith(
    'i1',
    expect.objectContaining({ quantity: 12, category_id: 'c2' }),
  );
});

it('does not offer changing the tracking type on an existing item', async () => {
  await renderScreen({ itemId: 'i1' });
  expect(screen.queryByText('Yes/No')).toBeNull();
});

it('stays on the form and explains when saving fails', async () => {
  (createItem as jest.Mock).mockRejectedValue({ code: '23505' });
  await renderScreen({ categoryId: 'c1' });
  await fireEvent.changeText(screen.getByLabelText('Item name'), 'Eggs');
  await fireEvent.press(screen.getByText('Save'));
  expect(await screen.findByText('That name is already in use.')).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});
