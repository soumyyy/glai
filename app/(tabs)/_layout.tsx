import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { GlassTabBar } from '../../components/GlassTabBar';

export default function TabLayout() {
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
