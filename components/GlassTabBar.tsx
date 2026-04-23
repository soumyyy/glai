import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ROUTE_LABELS: Record<string, string> = {
  index: "Today",
  history: "History",
  profile: "Profile",
};

const ICONS: Record<
  string,
  {
    focused: keyof typeof Ionicons.glyphMap;
    unfocused: keyof typeof Ionicons.glyphMap;
  }
> = {
  index: { focused: "today", unfocused: "today-outline" },
  history: { focused: "calendar", unfocused: "calendar-outline" },
  profile: { focused: "person", unfocused: "person-outline" },
};

const GREEN = "#1E6C62";
const BAR_H = 58;
const CAM_SIZE = 60; // taller than bar so it stands out
const H_PAD = 16;
const GAP = 12;

function triggerHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const BOTTOM_PAD = Math.max(insets.bottom, 12);
  const tabsWidth = width - H_PAD * 2 - CAM_SIZE - GAP;
  const tabW = tabsWidth / state.routes.length;

  const indicatorX = useSharedValue(state.index * tabW);
  const camScale = useSharedValue(1);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabW, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
    });
  }, [indicatorX, state.index, tabW]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const camAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: camScale.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outer,
        { paddingBottom: BOTTOM_PAD, paddingHorizontal: H_PAD },
      ]}
    >
      <View style={styles.row}>
        {/* ── Tab pill ──────────────────────────────────────────────────── */}
        <View style={[styles.barShadow, { width: tabsWidth, height: BAR_H }]}>
          <BlurView
            intensity={90}
            tint="light"
            experimentalBlurMethod="dimezisBlurView"
            style={[styles.bar, { width: tabsWidth, height: BAR_H }]}
          >
            {/* Sliding liquid indicator */}
            <Animated.View
              style={[styles.indicator, { width: tabW }, indicatorStyle]}
            >
              <BlurView
                intensity={35}
                tint="light"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.indicatorShimmer} />
            </Animated.View>

            {state.routes.map((route, index) => {
              const options = descriptors[route.key].options;
              const label =
                typeof options.title === "string"
                  ? options.title
                  : (ROUTE_LABELS[route.name] ?? route.name);
              const isFocused = state.index === index;
              const icons = ICONS[route.name];

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={() => {
                    triggerHaptic();
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented)
                      navigation.navigate(route.name, route.params);
                  }}
                  style={styles.tab}
                >
                  <Ionicons
                    name={
                      isFocused
                        ? (icons?.focused ?? "ellipse")
                        : (icons?.unfocused ?? "ellipse-outline")
                    }
                    size={18}
                    color={isFocused ? "#1B1511" : "#9E9186"}
                  />
                  <Text style={[styles.label, isFocused && styles.labelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>

        {/* ── Camera button ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.camShadow,
            { width: CAM_SIZE, height: CAM_SIZE },
            camAnimStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a meal"
            onPressIn={() => {
              camScale.value = withSpring(0.9, { damping: 16, stiffness: 420 });
            }}
            onPressOut={() => {
              camScale.value = withSpring(1, { damping: 14, stiffness: 300 });
            }}
            onPress={() => {
              triggerHaptic();
              router.push("/camera");
            }}
            style={styles.camPressable}
          >
            <View style={styles.camBody}>
              <Ionicons
                name="camera"
                size={24}
                color="rgba(255,255,255,0.92)"
              />
            </View>
            {/* Specular shimmer on the green button */}
            <View style={styles.camShimmer} pointerEvents="none" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: GAP,
  },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  barShadow: {
    borderRadius: 20,
    shadowColor: "#1A120B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  bar: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.58)",
    backgroundColor: "rgba(245,239,227,0.52)",
  },

  indicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.70)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
  },
  indicatorShimmer: {
    position: "absolute",
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.95)",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    zIndex: 1,
    gap: 3,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9E9186",
    letterSpacing: 0.15,
  },
  labelActive: {
    fontWeight: "700",
    color: "#1B1511",
  },

  // ── Camera button ──────────────────────────────────────────────────────────
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
