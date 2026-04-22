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
