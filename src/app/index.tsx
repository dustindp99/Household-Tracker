import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { errorMessage, listMyHouseholds } from '@/lib/households';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const queryClient = useQueryClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const households = useQuery({
    queryKey: ['households', 'mine', userId],
    queryFn: () => listMyHouseholds(userId),
    enabled: !!userId,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['households', 'mine'] });
    }, [queryClient]),
  );

  async function signOut() {
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setIsSigningOut(false);
    if (error) {
      Alert.alert("Couldn't sign out", error.message);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {households.isError && <Text style={styles.body}>{errorMessage(households.error)}</Text>}

      {households.data?.length === 0 && (
        <Text style={styles.body}>
          You're not in a household yet. Create one, or join with an invite code.
        </Text>
      )}

      {households.data?.map(({ household, role }) => (
        <Link key={household.id} href={`/household/${household.id}`} asChild>
          <Pressable style={styles.card} accessibilityRole="button">
            <Text style={styles.cardTitle}>{household.name}</Text>
            <Text style={styles.cardRole}>{role}</Text>
          </Pressable>
        </Link>
      ))}

      <View style={styles.actions}>
        <Button title="Create a household" onPress={() => router.push('/household/new')} />
        <Button title="Join with a code" onPress={() => router.push('/join')} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.email}>{session?.user.email}</Text>
        <Button title="Sign out" onPress={signOut} disabled={isSigningOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    gap: 12,
    padding: 24,
  },
  body: {
    fontSize: 16,
    color: '#555',
  },
  card: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    gap: 2,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardRole: {
    fontSize: 14,
    color: '#555',
  },
  actions: {
    gap: 8,
    marginTop: 12,
  },
  footer: {
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto',
    paddingTop: 24,
  },
  email: {
    fontSize: 14,
    color: '#555',
  },
});
