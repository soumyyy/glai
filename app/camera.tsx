import { useRef, useState } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealStore } from '../lib/store/mealStore';
import { compressToBase64 } from '../lib/image/compress';
import { Colors } from '../constants/colors';

export default function CameraScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isAddMore = mode === 'addmore';
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const setImage = useMealStore((s) => s.setImage);
  const setAdditionalImage = useMealStore((s) => s.setAdditionalImage);
  const [processing, setProcessing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  function storeImage(base64: string) {
    if (isAddMore) {
      setAdditionalImage(base64);
      router.push('/portion?mode=addmore');
    } else {
      setImage(base64);
      router.push('/portion');
    }
  }

  async function handleCapture() {
    if (!cameraRef.current || processing || !cameraReady) return;
    setProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false, quality: 1 });
      if (!photo?.uri) throw new Error('No photo captured');
      const base64 = await compressToBase64(photo.uri);
      storeImage(base64);
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
      storeImage(base64);
    } catch {
      Alert.alert('Error', 'Could not load image. Please try again.');
    } finally {
      setProcessing(false);
    }
  }

  if (!permission) {
    return (
      <View style={styles.permissionScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionCopy}>
          Glai uses the camera to photograph your meals and identify them.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionSecondary} onPress={handleGallery}>
          <Text style={styles.permissionSecondaryText}>Use gallery instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setCameraReady(true)}
      />

      <View pointerEvents="box-none" style={styles.overlay}>
        {/* Top controls */}
        <View style={[styles.topBar, { paddingTop: insets.top + 14 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.pill}>
            <Text style={styles.pillText}>{isAddMore ? 'Back' : 'Close'}</Text>
          </TouchableOpacity>
          {!cameraReady && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>Loading…</Text>
            </View>
          )}
        </View>

        {/* Frame guide */}
        <View style={styles.frameZone}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.frameHint}>Keep the full plate inside</Text>
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <TouchableOpacity
            style={styles.galleryPill}
            onPress={handleGallery}
            disabled={processing}
          >
            <Text style={styles.pillText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shutter, (!cameraReady || processing) && styles.shutterDim]}
            onPress={handleCapture}
            disabled={!cameraReady || processing}
            activeOpacity={0.85}
          >
            {processing
              ? <ActivityIndicator color="#1F1813" size="small" />
              : <View style={styles.shutterDot} />}
          </TouchableOpacity>

          <View style={styles.shutterSpacer} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },

  // Permission
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 28,
    justifyContent: 'center',
    gap: 12,
  },
  permissionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  permissionCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  permissionButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  permissionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  permissionSecondary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  permissionSecondaryText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },

  // Camera UI
  topBar: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  pillText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  frameZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  frame: {
    width: '100%',
    maxWidth: 300,
    aspectRatio: 1,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#fff',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  frameHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  bottomBar: {
    paddingHorizontal: 28,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryPill: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.52)',
    minWidth: 80,
    alignItems: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  shutterDim: { opacity: 0.45 },
  shutterDot: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  shutterSpacer: { minWidth: 80 },
});
