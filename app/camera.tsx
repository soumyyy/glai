import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function CameraScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera</Text>
      <Text style={styles.subtitle}>Full-screen camera viewfinder goes here</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push('/portion')}>
        <Text style={styles.buttonText}>→ Portion (dev nav)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center' },
  button: { marginTop: 32, padding: 16, backgroundColor: Colors.primary, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  close: { marginTop: 16, padding: 12 },
  closeText: { color: '#999' },
});
