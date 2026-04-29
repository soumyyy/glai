import { Redirect, Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GlassTabBar } from '../../components/GlassTabBar';
import { useAuthStore } from '../../lib/store/authStore';
import { getSetting } from '../../lib/db/settings';

export default function TabLayout() {
  const { isReady, isMigrating, session } = useAuthStore();

  if (!isReady || isMigrating) {
    return null;
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  if (!getSetting('onboarded')) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
      }}
      tabBar={(props) => <GlassTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: { backgroundColor: 'transparent' },
});
