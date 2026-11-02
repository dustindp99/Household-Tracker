// Runs the real email-code flow against the local Supabase stack (`npm run db:start`).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { newClient, readCodeFromEmail, uniqueEmail } from './helpers.mjs';

test('a new user signs in with an emailed code', async () => {
  const client = newClient();
  const email = uniqueEmail();

  assert.equal((await client.auth.signInWithOtp({ email })).error, null);
  const token = await readCodeFromEmail(email);
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });

  assert.equal(error, null);
  assert.equal(data.user.email, email);
  assert.ok(data.session.access_token);
});

test('a wrong code is rejected', async () => {
  const client = newClient();
  const email = uniqueEmail();

  assert.equal((await client.auth.signInWithOtp({ email })).error, null);
  const token = await readCodeFromEmail(email);
  const wrong = token === '000000' ? '000001' : '000000';
  const { data, error } = await client.auth.verifyOtp({ email, token: wrong, type: 'email' });

  assert.ok(error);
  assert.equal(data.session, null);
});

test('a code cannot be used twice', async () => {
  const client = newClient();
  const email = uniqueEmail();

  assert.equal((await client.auth.signInWithOtp({ email })).error, null);
  const token = await readCodeFromEmail(email);
  assert.equal((await client.auth.verifyOtp({ email, token, type: 'email' })).error, null);

  const replay = await newClient().auth.verifyOtp({ email, token, type: 'email' });
  assert.ok(replay.error);
});
