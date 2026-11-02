import { useLocalSearchParams } from 'expo-router';

import SignInScreen from '@/app/sign-in';
import { useAuth } from '@/auth/AuthProvider';
import { JoinForm } from '@/components/JoinForm';

// Reachable while signed out, so an invite link survives signing in first.
export default function JoinFromLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useAuth();

  if (!session) {
    return <SignInScreen />;
  }
  return <JoinForm initialCode={code} />;
}
