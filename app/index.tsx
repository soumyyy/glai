import { Redirect } from 'expo-router';
import { getSetting } from '../lib/db/settings';

export default function IndexRoute() {
  return <Redirect href={getSetting('onboarded') ? '/(tabs)' : '/onboarding'} />;
}
