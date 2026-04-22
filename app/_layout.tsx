import 'react-native-url-polyfill/auto';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { initSchema } from '../lib/db/schema';

export default function RootLayout() {
  const [, requestPermission] = useCameraPermissions();

  useEffect(() => {
    initSchema();
    requestPermission();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false }} />
      <Stack.Screen name="portion" options={{ presentation: 'modal', title: 'Portion Size' }} />
      <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Review' }} />
      <Stack.Screen name="save-confirmation" options={{ presentation: 'modal', title: 'Save Meal' }} />
      <Stack.Screen name="day/[date]" options={{ title: 'Day Detail' }} />
      <Stack.Screen name="meal/[id]" options={{ title: 'Meal Detail' }} />
    </Stack>
  );
}
