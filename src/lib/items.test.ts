import { canEditItems, formatStock, parseCount } from './items';

jest.mock('./supabase', () => ({ supabase: {} }));

describe('canEditItems', () => {
  it.each([
    ['owner', true],
    ['editor', true],
    ['viewer', false],
    [undefined, false],
  ] as const)('%s: %s', (role, expected) => {
    expect(canEditItems(role)).toBe(expected);
  });
});

describe('parseCount', () => {
  it.each([
    ['0', 0],
    [' 12 ', 12],
  ])('accepts %p', (text, expected) => {
    expect(parseCount(text)).toBe(expected);
  });

  it.each(['', '-1', '1.5', 'six'])('rejects %p', (text) => {
    expect(parseCount(text)).toBeNull();
  });
});

describe('formatStock', () => {
  it('shows a counter as its quantity, including zero', () => {
    expect(formatStock({ tracking_type: 'counter', quantity: 0, in_stock: null })).toBe('0');
  });

  it('shows a yes/no item as Yes or No', () => {
    expect(formatStock({ tracking_type: 'yes_no', quantity: null, in_stock: true })).toBe('Yes');
    expect(formatStock({ tracking_type: 'yes_no', quantity: null, in_stock: false })).toBe('No');
  });
});
