import assert from 'node:assert/strict';

import { createClient } from '@supabase/supabase-js';

const MAILPIT_URL = 'http://127.0.0.1:54324';

export function newClient() {
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function readCodeFromEmail(email) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const search = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
    ).then((response) => response.json());
    if (search.messages?.length) {
      const message = await fetch(`${MAILPIT_URL}/api/v1/message/${search.messages[0].ID}`).then(
        (response) => response.json(),
      );
      const code = message.Text.match(/\b\d{6}\b/)?.[0];
      assert.ok(code, `no 6-digit code in email: ${message.Text}`);
      return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no email arrived for ${email}`);
}

export async function signedInClient() {
  const client = newClient();
  const email = uniqueEmail();
  assert.equal((await client.auth.signInWithOtp({ email })).error, null);
  const token = await readCodeFromEmail(email);
  const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
  assert.equal(error, null);
  return { client, user: data.user };
}
