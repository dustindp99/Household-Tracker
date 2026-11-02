// Runs the household flow as real signed-in users through the public API (`npm run db:start`).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newClient, signedInClient } from './helpers.mjs';

async function rpc(client, name, args) {
  const { data, error } = await client.rpc(name, args);
  assert.equal(error, null);
  return data;
}

test('an invite brings a second user in, and the owner stays in control', async () => {
  const owner = await signedInClient();
  const joiner = await signedInClient();
  const householdId = await rpc(owner.client, 'create_household', {
    household_name: 'Home',
    member_display_name: 'Olive',
  });

  assert.deepEqual((await joiner.client.from('households').select('id')).data, []);

  const invite = await rpc(owner.client, 'create_invite', {
    target_household: householdId,
    invite_role: 'viewer',
  });
  await rpc(joiner.client, 'join_household', {
    invite_code: invite.code,
    member_display_name: 'Ben',
  });

  const { data: seen } = await joiner.client.from('members').select('display_name, role').order('role');
  assert.deepEqual(seen, [
    { display_name: 'Olive', role: 'owner' },
    { display_name: 'Ben', role: 'viewer' },
  ]);

  // A viewer's attempts to rename or delete change nothing.
  await joiner.client.from('households').update({ name: 'Mine' }).eq('id', householdId);
  await joiner.client.from('households').delete().eq('id', householdId);
  const { data: unchanged } = await owner.client.from('households').select('name').eq('id', householdId);
  assert.deepEqual(unchanged, [{ name: 'Home' }]);

  // Only the owner's rename and delete take effect, and members lose access with the household.
  await owner.client.from('households').update({ name: 'Our home' }).eq('id', householdId);
  const { data: renamed } = await joiner.client.from('households').select('name');
  assert.deepEqual(renamed, [{ name: 'Our home' }]);

  assert.equal((await owner.client.from('households').delete().eq('id', householdId)).error, null);
  assert.deepEqual((await joiner.client.from('households').select('id')).data, []);
  assert.deepEqual((await joiner.client.from('members').select('id')).data, []);
});

test('two people racing for one code: exactly one gets in', async () => {
  const owner = await signedInClient();
  const [first, second] = [await signedInClient(), await signedInClient()];
  const householdId = await rpc(owner.client, 'create_household', {
    household_name: 'Race',
    member_display_name: 'Olive',
  });
  const invite = await rpc(owner.client, 'create_invite', {
    target_household: householdId,
    invite_role: 'editor',
  });

  const results = await Promise.all(
    [first, second].map(({ client }) =>
      client.rpc('join_household', { invite_code: invite.code, member_display_name: 'Racer' }),
    ),
  );

  assert.equal(results.filter((result) => result.error === null).length, 1);
  assert.equal(results.filter((result) => result.error?.message === 'invalid_invite').length, 1);
  const { data: members } = await owner.client.from('members').select('id').eq('household_id', householdId);
  assert.equal(members.length, 2);
});

test('signed-out requests see and can do nothing', async () => {
  const anonymous = newClient();
  const { error: readError } = await anonymous.from('households').select('id');
  assert.ok(readError);
  const { error: rpcError } = await anonymous.rpc('create_household', {
    household_name: 'Nope',
    member_display_name: 'Nope',
  });
  assert.ok(rpcError);
});
