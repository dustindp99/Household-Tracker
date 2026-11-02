import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { createHousehold, errorMessage } from '@/lib/households';

export default function NewHouseholdScreen() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function create() {
    setIsBusy(true);
    setError(null);
    try {
      const householdId = await createHousehold(name, displayName);
      await queryClient.invalidateQueries({ queryKey: ['households'] });
      router.replace(`/household/${householdId}`);
    } catch (createError) {
      setError(errorMessage(createError));
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Household name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Home"
        accessibilityLabel="Household name"
        autoCapitalize="words"
        maxLength={80}
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
        title="Create household"
        onPress={create}
        disabled={isBusy || !name.trim() || !displayName.trim()}
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
