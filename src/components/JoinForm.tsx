import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { errorMessage, joinHousehold } from '@/lib/households';
import { isValidInviteCode, normalizeInviteCode } from '@/lib/validation';

export function JoinForm({ initialCode = '' }: { initialCode?: string }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState(normalizeInviteCode(initialCode));
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function join() {
    setIsBusy(true);
    setError(null);
    try {
      const householdId = await joinHousehold(code, displayName);
      await queryClient.invalidateQueries({ queryKey: ['households'] });
      router.replace(`/household/${householdId}`);
    } catch (joinError) {
      setError(errorMessage(joinError));
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Invite code</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(text) => setCode(normalizeInviteCode(text))}
        placeholder="K7M2QXAB"
        accessibilityLabel="Invite code"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
      />
      <Text style={styles.label}>Your name in this household</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Sam"
        accessibilityLabel="Your name"
        autoCapitalize="words"
        maxLength={50}
      />
      <Button
        title="Join household"
        onPress={join}
        disabled={isBusy || !isValidInviteCode(code) || !displayName.trim()}
      />
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    gap: 12,
    padding: 24,
  },
  label: {
    fontSize: 14,
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
