import { Redirect } from 'expo-router';
import { getSetting } from '../lib/db/settings';
import { useAuthStore } from '../lib/store/authStore';

export default function IndexRoute() {
  const { isReady, isMigrating, session } = useAuthStore();

  if (!isReady || isMigrating) {
    return null;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href={getSetting('onboarded') ? '/(tabs)' : '/onboarding'} />;
}
