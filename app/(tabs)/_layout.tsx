import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

function CameraTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.cameraButton} activeOpacity={0.8}>
      <View style={styles.cameraCircle} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabIconActive,
        tabBarInactiveTintColor: Colors.tabIcon,
        tabBarStyle: styles.tabBar,
        headerShown: false,
      }}
    >
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          tabBarButton: () => (
            <CameraTabButton onPress={() => router.push('/camera')} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    height: 64,
    borderTopColor: Colors.border,
  },
  cameraButton: {
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
});
