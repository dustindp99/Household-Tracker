import type { Database } from './database.types';
import type { MemberRole } from './households';
import { supabase } from './supabase';

export type Category = Database['public']['Tables']['categories']['Row'];
export type Item = Database['public']['Tables']['items']['Row'];
export type TrackingType = Database['public']['Enums']['tracking_type'];

export function canEditItems(role: MemberRole | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

// Whole numbers only, because the database stores counts as integers.
export function parseCount(text: string): number | null {
  const trimmed = text.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

export function formatStock(item: Pick<Item, 'tracking_type' | 'quantity' | 'in_stock'>): string {
  if (item.tracking_type === 'counter') {
    return String(item.quantity);
  }
  return item.in_stock ? 'Yes' : 'No';
}

// Row-level security turns a forbidden update or delete into "0 rows changed" rather than an error.
function requireChange(rows: unknown[] | null) {
  if (!rows?.length) {
    throw { message: 'not_allowed' };
  }
}

export async function listCategories(householdId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return data;
}

export async function listItems(householdId: string) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('household_id', householdId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function createCategory(householdId: string, name: string) {
  const { error } = await supabase
    .from('categories')
    .insert({ household_id: householdId, name: name.trim() });
  if (error) throw error;
}

export async function renameCategory(id: string, name: string) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireChange(data);
}

export async function deleteCategory(id: string) {
  const { data, error } = await supabase.from('categories').delete().eq('id', id).select('id');
  if (error) throw error;
  requireChange(data);
}

export type NewItem = {
  household_id: string;
  category_id: string;
  name: string;
  tracking_type: TrackingType;
  quantity: number | null;
  in_stock: boolean | null;
  low_threshold: number | null;
};

export async function createItem(item: NewItem) {
  const { error } = await supabase.from('items').insert({ ...item, name: item.name.trim() });
  if (error) throw error;
}

export type ItemChanges = Partial<
  Pick<Item, 'category_id' | 'name' | 'quantity' | 'in_stock' | 'low_threshold'>
>;

export async function updateItem(id: string, changes: ItemChanges) {
  const { data, error } = await supabase
    .from('items')
    .update(changes.name === undefined ? changes : { ...changes, name: changes.name.trim() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireChange(data);
}

export async function deleteItem(id: string) {
  const { data, error } = await supabase.from('items').delete().eq('id', id).select('id');
  if (error) throw error;
  requireChange(data);
}
