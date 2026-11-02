import { useState } from 'react';
import {
  Button,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { CODE_LENGTH, isValidCode, isValidEmail, normalizeEmail } from '@/lib/validation';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function sendCode(address: string) {
    setIsBusy(true);
    setError(null);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: address });
    setIsBusy(false);
    if (sendError) {
      setError(`Couldn't send the code. ${sendError.message}`);
      return;
    }
    setSentTo(address);
  }

  async function verifyCode(address: string) {
    setIsBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: address,
      token: code,
      type: 'email',
    });
    // On success the auth listener swaps this screen for the signed-in stack.
    setIsBusy(false);
    if (verifyError) {
      setError("That code didn't work. Check it or request a new one.");
    }
  }

  function useDifferentEmail() {
    setSentTo(null);
    setCode('');
    setError(null);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Household Tracker</Text>

      {sentTo === null ? (
        <>
          <Text style={styles.body}>Enter your email and we'll send you a sign-in code.</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Button
            title="Send code"
            onPress={() => sendCode(normalizeEmail(email))}
            disabled={isBusy || !isValidEmail(email)}
          />
        </>
      ) : (
        <>
          <Text style={styles.body}>Enter the {CODE_LENGTH}-digit code sent to {sentTo}.</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            accessibilityLabel="Sign-in code"
            autoComplete="one-time-code"
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            textContentType="oneTimeCode"
          />
          <Button
            title="Sign in"
            onPress={() => verifyCode(sentTo)}
            disabled={isBusy || !isValidCode(code)}
          />
          <Button title="Resend code" onPress={() => sendCode(sentTo)} disabled={isBusy} />
          <Button title="Use a different email" onPress={useDifferentEmail} disabled={isBusy} />
        </>
      )}

      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 16,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    padding: 12,
  },
  error: {
    color: '#b00020',
    fontSize: 14,
  },
});
