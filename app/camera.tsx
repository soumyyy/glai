// app/camera.tsx
import { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMealStore } from '../lib/store/mealStore';
import { compressToBase64 } from '../lib/image/compress';

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const setImage = useMealStore((s) => s.setImage);
  const [processing, setProcessing] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current || processing) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1 });
      if (!photo?.uri) throw new Error('No photo captured');
      const base64 = await compressToBase64(photo.uri);
      setImage(base64);
      router.push('/portion');
    } catch {
      Alert.alert('Error', 'Could not capture photo. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  async function handleGallery() {
    if (processing) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setProcessing(true);
    try {
      const base64 = await compressToBase64(result.assets[0].uri);
      setImage(base64);
      router.push('/portion');
    } catch {
      Alert.alert('Error', 'Could not load image. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Guidance text */}
        <View style={styles.guidanceContainer}>
          <Text style={styles.guidanceText}>Frame your full plate</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity onPress={handleGallery} style={styles.galleryButton} disabled={processing}>
            <Text style={styles.galleryText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCapture}
            style={[styles.shutterButton, processing && styles.shutterDisabled]}
            disabled={processing}
            activeOpacity={0.8}
          >
            {processing
              ? <ActivityIndicator color="#000" />
              : <View style={styles.shutterInner} />}
          </TouchableOpacity>

          {/* Spacer to balance layout */}
          <View style={styles.galleryButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },

  topBar: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  guidanceContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guidanceText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  galleryButton: { width: 64, alignItems: 'center' },
  galleryText: { color: '#fff', fontSize: 13 },

  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
});
