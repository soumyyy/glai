import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const GREEN = "#1E6C62";
const CAM_SIZE = 60;

interface Props {
  onCamera: () => void;
  onManual: () => void;
}

export function CameraFAB({ onCamera, onManual }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const camScale = useSharedValue(1);
  const pencilOpacity = useSharedValue(0);
  const pencilY = useSharedValue(10);

  function openMenu() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setMenuOpen(true);
    pencilOpacity.value = withSpring(1, { damping: 18, stiffness: 300 });
    pencilY.value = withSpring(0, { damping: 18, stiffness: 300 });
  }

  function closeMenu() {
    setMenuOpen(false);
    pencilOpacity.value = withSpring(0, { damping: 20, stiffness: 400 });
    pencilY.value = withSpring(10, { damping: 20, stiffness: 400 });
  }

  const camAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: camScale.value }],
  }));

  const pencilAnimStyle = useAnimatedStyle(() => ({
    opacity: pencilOpacity.value,
    transform: [{ translateY: pencilY.value }],
  }));

  return (
    <View style={s.wrapper} pointerEvents="box-none">
      {menuOpen && (
        <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
      )}

      <View style={s.camWrapper}>
        {/* Pencil button — floats above on long press */}
        <Animated.View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={[s.camShadow, s.pencilBtn, { width: CAM_SIZE, height: CAM_SIZE }, pencilAnimStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log manually"
            onPress={() => { closeMenu(); onManual(); }}
            style={s.camPressable}
          >
            <View style={s.camBody}>
              <Ionicons name="pencil" size={20} color="rgba(255,255,255,0.92)" />
            </View>
            <View style={s.camShimmer} pointerEvents="none" />
          </Pressable>
        </Animated.View>

        {/* Camera button */}
        <Animated.View style={[s.camShadow, { width: CAM_SIZE, height: CAM_SIZE }, camAnimStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a meal"
            onPressIn={() => {
              if (menuOpen) return;
              camScale.value = withSpring(0.9, { damping: 16, stiffness: 420 });
            }}
            onPressOut={() => {
              camScale.value = withSpring(1, { damping: 14, stiffness: 300 });
            }}
            onPress={() => {
              if (menuOpen) { closeMenu(); return; }
              Haptics.selectionAsync().catch(() => {});
              onCamera();
            }}
            onLongPress={openMenu}
            delayLongPress={400}
            style={s.camPressable}
          >
            <View style={s.camBody}>
              <Ionicons name="camera" size={24} color="rgba(255,255,255,0.92)" />
            </View>
            <View style={s.camShimmer} pointerEvents="none" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
  },
  camWrapper: {
    width: CAM_SIZE,
    height: CAM_SIZE,
  },
  pencilBtn: {
    position: "absolute",
    bottom: CAM_SIZE + 10,
    left: 0,
  },
  camShadow: {
    borderRadius: 999,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  camPressable: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  camBody: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
  camShimmer: {
    position: "absolute",
    top: 0,
    left: 10,
    right: 10,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
});
