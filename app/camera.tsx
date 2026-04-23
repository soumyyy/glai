// app/camera.tsx
import { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
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
        <Text style={styles.permissionTitle}>Preparing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionEyebrow}>Camera access</Text>
        <Text style={styles.permissionTitle}>Glai needs camera permission to capture meals.</Text>
        <Text style={styles.permissionCopy}>
          You can still use the gallery once permission is granted, but the core logging flow starts
          from the camera.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permissionSecondary} onPress={handleGallery}>
          <Text style={styles.permissionSecondaryText}>Choose from gallery instead</Text>
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>{isAddMore ? 'Back' : 'Close'}</Text>
          </TouchableOpacity>
          <View style={styles.readyPill}>
            <Text style={styles.readyText}>{cameraReady ? 'Ready' : 'Loading'}</Text>
          </View>
        </View>

        <View style={styles.centerZone}>
          <View style={styles.frame}>
            <View style={styles.frameCornerTopLeft} />
            <View style={styles.frameCornerTopRight} />
            <View style={styles.frameCornerBottomLeft} />
            <View style={styles.frameCornerBottomRight} />
          </View>
        </View>

        <View style={[styles.bottomZone, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.captionCard}>
            <Text style={styles.captionEyebrow}>Capture</Text>
            <Text style={styles.captionTitle}>Keep the full plate inside the frame.</Text>
            <Text style={styles.captionCopy}>
              Good lighting and a straight top-down angle improve dish detection and carb estimates.
            </Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              onPress={handleGallery}
              style={styles.galleryButton}
              disabled={processing}
            >
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCapture}
              style={[styles.shutterButton, (processing || !cameraReady) && styles.shutterDisabled]}
              disabled={processing || !cameraReady}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <View style={styles.spacer} />
          </View>
        </View>
      </View>

      {processing ? (
        <View style={styles.processingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.processingTitle}>Preparing photo</Text>
          <Text style={styles.processingCopy}>Compressing image before analysis...</Text>
        </View>
      ) : null}
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
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  permissionEyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
    fontWeight: '700',
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
    fontWeight: '700',
  },
  permissionCopy: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  permissionSecondary: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.surfaceStrong,
  },
  permissionSecondaryText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  frame: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  frameCornerTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 34,
    height: 34,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderTopLeftRadius: 14,
  },
  frameCornerTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderTopRightRadius: 14,
  },
  frameCornerBottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 34,
    height: 34,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#fff',
    borderBottomLeftRadius: 14,
  },
  frameCornerBottomRight: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 34,
    height: 34,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
    borderBottomRightRadius: 14,
  },
  bottomZone: {
    paddingHorizontal: 20,
    gap: 14,
  },
  captionCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    gap: 6,
  },
  captionEyebrow: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  captionTitle: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  captionCopy: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 19,
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryButton: {
    minWidth: 84,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
  },
  galleryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  spacer: {
    minWidth: 84,
  },

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
  readyPill: {
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
  },
  readyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  processingTitle: {
    marginTop: 16,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  processingCopy: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    textAlign: 'center',
  },
});
