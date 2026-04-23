import { BlurView } from 'expo-blur';
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

const FAB_SIZE = 64;
const FAB_LIFT = 22; // how much the FAB floats above the pill top edge
const PILL_HEIGHT = 64;
const PILL_PADDING = 7;

function triggerSelectionHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

function CameraIcon() {
  return (
    <View style={fabIcon.wrap}>
      {/* Camera body */}
      <View style={fabIcon.body}>
        {/* Lens ring */}
        <View style={fabIcon.lensRing}>
          <View style={fabIcon.lensDot} />
        </View>
      </View>
      {/* Top bump */}
      <View style={fabIcon.bump} />
    </View>
  );
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const indicatorIndex = useSharedValue(state.index);

  const pillWidth = width - 36; // 18px padding each side
  const indicatorWidth = (pillWidth - PILL_PADDING * 2) / state.routes.length;

  useEffect(() => {
    indicatorIndex.value = withSpring(state.index, {
      damping: 20,
      stiffness: 260,
      mass: 0.7,
    });
  }, [indicatorIndex, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * indicatorWidth }],
  }));

  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: bottomPad }]}
    >
      {/* Camera FAB — floats above the pill center */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open camera to log a meal"
        onPress={() => {
          triggerSelectionHaptic();
          router.push('/camera');
        }}
        style={styles.fabPressable}
      >
        <View style={styles.fab}>
          <CameraIcon />
        </View>
      </Pressable>

      {/* Tab pill */}
      <View style={[styles.pillShadow, { width: pillWidth }]}>
        <BlurView intensity={68} tint="light" style={[styles.pill, { width: pillWidth }]}>
          {/* Sliding indicator */}
          <Animated.View
            style={[
              styles.indicator,
              { width: indicatorWidth },
              indicatorStyle,
            ]}
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
                  triggerSelectionHaptic();
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
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 0,
  },

  // Camera FAB
  fabPressable: {
    zIndex: 10,
    marginBottom: -(FAB_SIZE / 2 - FAB_LIFT), // overlaps pill top
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 12,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },

  // Pill tab bar
  pillShadow: {
    borderRadius: 999,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  pill: {
    height: PILL_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PILL_PADDING,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.tabBar,
  },
  indicator: {
    position: 'absolute',
    top: PILL_PADDING,
    bottom: PILL_PADDING,
    left: PILL_PADDING,
    borderRadius: 999,
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
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.tabIcon,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    color: Colors.tabIconActive,
    fontWeight: '700',
  },
});

const fabIcon = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    width: 26,
    height: 20,
    borderRadius: 6,
    borderWidth: 2.2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensRing: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lensDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
    opacity: 0.7,
  },
  bump: {
    position: 'absolute',
    top: -6,
    left: 7,
    width: 8,
    height: 4,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#fff',
    borderBottomWidth: 0,
  },
});
