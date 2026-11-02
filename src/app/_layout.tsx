import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/auth/AuthProvider';

const queryClient = new QueryClient();

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const userId = session?.user.id;

  // One user's cached data must never be shown to the next person to sign in on this phone.
  useEffect(() => {
    queryClient.clear();
  }, [userId]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: 'Your households' }} />
        <Stack.Screen name="household/new" options={{ title: 'New household' }} />
        <Stack.Screen name="household/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="household/[id]/settings" options={{ title: 'Household settings' }} />
        <Stack.Screen name="household/[id]/category" options={{ title: 'Category' }} />
        <Stack.Screen name="household/[id]/item" options={{ title: 'Item' }} />
        <Stack.Screen name="join/index" options={{ title: 'Join a household' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="join/[code]" options={{ title: 'Join a household' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
