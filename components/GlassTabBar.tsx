import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Colors } from '../constants/colors';

const ROUTE_LABELS: Record<string, string> = {
  index: 'Today',
  history: 'History',
  profile: 'Profile',
};

function triggerHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const CAMERA_BTN = 52;
  const BAR_HEIGHT = 56;
  const H_PAD = 16;
  const BOTTOM_PAD = Math.max(insets.bottom, 10);

  // Tabs occupy all space left of the camera button + gap
  const tabsWidth = width - H_PAD * 2 - CAMERA_BTN - 12;
  const indicatorWidth = tabsWidth / state.routes.length;
  const indicatorIndex = useSharedValue(state.index);

  useEffect(() => {
    indicatorIndex.value = withSpring(state.index, {
      damping: 22,
      stiffness: 280,
      mass: 0.6,
    });
  }, [indicatorIndex, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * indicatorWidth }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: BOTTOM_PAD, paddingHorizontal: H_PAD }]}
    >
      <View style={styles.row}>
        {/* Tab bar */}
        <View style={[styles.barShadow, { width: tabsWidth, height: BAR_HEIGHT }]}>
          <BlurView
            intensity={60}
            tint="light"
            style={[styles.bar, { width: tabsWidth, height: BAR_HEIGHT }]}
          >
            {/* Sliding pill indicator */}
            <Animated.View
              style={[styles.indicator, { width: indicatorWidth }, indicatorStyle]}
            />

            {state.routes.map((route, index) => {
              const options = descriptors[route.key].options;
              const label =
                typeof options.title === 'string'
                  ? options.title
                  : ROUTE_LABELS[route.name] ?? route.name;
              const isFocused = state.index === index;

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  onPress={() => {
                    triggerHaptic();
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  style={styles.tab}
                >
                  <Text style={[styles.label, isFocused && styles.labelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>

        {/* Camera button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log a meal"
          onPress={() => {
            triggerHaptic();
            router.push('/camera');
          }}
          style={({ pressed }) => [
            styles.cameraBtn,
            { width: CAMERA_BTN, height: CAMERA_BTN, borderRadius: CAMERA_BTN / 2 },
            pressed && styles.cameraBtnPressed,
          ]}
        >
          <Ionicons name="camera" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Tab bar
  barShadow: {
    borderRadius: 18,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 6,
  },
  bar: {
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.tabBar,
  },
  indicator: {
    position: 'absolute',
    top: 5,
    bottom: 5,
    left: 0,
    borderRadius: 13,
    backgroundColor: Colors.glassStrong,
    borderWidth: 1,
    borderColor: Colors.frame,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.tabIcon,
    letterSpacing: 0.1,
  },
  labelActive: {
    fontWeight: '700',
    color: Colors.tabIconActive,
  },

  // Camera button
  cameraBtn: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
