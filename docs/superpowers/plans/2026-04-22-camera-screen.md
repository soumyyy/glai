# Glai — Camera Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Camera screen (Screen 2) so it opens instantly, captures or picks an image, compresses it to max 1200px, stores the base64 in mealStore, and navigates to the Portion screen. No confidence shown anywhere in the UI.

**Architecture:** Pre-request camera permissions at app startup (root layout) so the camera modal renders immediately with no permission-check delay. Use expo-camera's `CameraView` for the viewfinder. Capture → compress via expo-image-manipulator → store base64 in mealStore → navigate to /portion. Gallery fallback via expo-image-picker. Photo is never written to disk beyond this point.

**Tech Stack:** expo-camera (CameraView), expo-image-manipulator, expo-image-picker, Zustand (mealStore)

---

## File Map

```
app/_layout.tsx              Modify: add permission pre-request on mount
app/camera.tsx               Replace: full camera screen implementation
lib/image/compress.ts        Create: image compression utility (1200px max)
```

---

## Task 1: Add image compression utility

**Files:**
- Create: `lib/image/compress.ts`

- [ ] **Step 1: Create lib/image/compress.ts**

```typescript
// lib/image/compress.ts
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1200;

export async function compressToBase64(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );

  if (!result.base64) throw new Error('Image compression failed: no base64 output');
  return result.base64;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add lib/image/compress.ts
git commit -m "feat: add image compression utility (1200px, JPEG, base64)"
```

---

## Task 2: Pre-request camera permissions at startup

**Files:**
- Modify: `app/_layout.tsx`

The goal is to call `useCameraPermissions()` in the root layout so the OS permission dialog fires before the user ever taps the camera button. When the modal opens, permission is already granted and `CameraView` renders instantly.

- [ ] **Step 1: Update app/_layout.tsx**

```typescript
// app/_layout.tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add app/_layout.tsx
git commit -m "feat: pre-request camera permissions at app startup for instant camera open"
```

---

## Task 3: Build the Camera screen

**Files:**
- Replace: `app/camera.tsx`

The screen must:
- Render `CameraView` immediately (permission already granted)
- Show a large shutter button at the bottom center
- Show a small "Choose from gallery" link below the shutter
- Show a back/cancel button top-left
- On capture: compress → store base64 in mealStore → navigate to /portion
- On gallery pick: compress → store base64 in mealStore → navigate to /portion
- Never write the photo to disk

- [ ] **Step 1: Replace app/camera.tsx**

```typescript
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/soumya/Desktop/glai && npx tsc --noEmit 2>&1
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/soumya/Desktop/glai
git add app/camera.tsx
git commit -m "feat: build Camera screen with instant open, capture, gallery, and 1200px compression"
```

- [ ] **Step 4: Push to remote**

```bash
cd /Users/soumya/Desktop/glai && git push
```
