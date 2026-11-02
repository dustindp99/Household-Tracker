// Runs the inventory flow as real signed-in users through the public API (`npm run db:start`).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { signedInClient } from './helpers.mjs';

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  assert.equal(error, null);
  return data;
}

test('an editor manages inventory, and a viewer can only read it', async () => {
  const owner = await signedInClient();
  const editor = await signedInClient();
  const viewer = await signedInClient();
  const householdId = await rpc(owner.client, 'create_household', {
    household_name: 'Home',
    member_display_name: 'Olive',
  });
  for (const [person, role] of [[editor, 'editor'], [viewer, 'viewer']]) {
    const invite = await rpc(owner.client, 'create_invite', {
      target_household: householdId,
      invite_role: role,
    });
    await rpc(person.client, 'join_household', { invite_code: invite.code, member_display_name: role });
  }

  const { data: category, error: categoryError } = await editor.client
    .from('categories')
    .insert({ household_id: householdId, name: 'Kitchen' })
    .select()
    .single();
  assert.equal(categoryError, null);

  const { data: item, error: itemError } = await editor.client
    .from('items')
    .insert({
      household_id: householdId,
      category_id: category.id,
      name: 'Eggs',
      tracking_type: 'counter',
      quantity: 6,
    })
    .select()
    .single();
  assert.equal(itemError, null);
  assert.equal(item.updated_by, editor.user.id);

  const { data: seen } = await viewer.client.from('items').select('name, quantity');
  assert.deepEqual(seen, [{ name: 'Eggs', quantity: 6 }]);

  const denied = await viewer.client
    .from('items')
    .insert({ household_id: householdId, category_id: category.id, name: 'Nope', tracking_type: 'yes_no', in_stock: true });
  assert.equal(denied.error?.code, '42501');
  const { data: changed } = await viewer.client.from('items').update({ quantity: 0 }).eq('id', item.id).select('id');
  assert.deepEqual(changed, []);

  const { data: removed } = await editor.client.from('categories').delete().eq('id', category.id).select('id');
  assert.equal(removed.length, 1);
  assert.deepEqual((await owner.client.from('items').select('id')).data, []);
});
