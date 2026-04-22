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

function triggerSelectionHaptic() {
  Haptics.selectionAsync().catch(() => {});
}

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const indicatorIndex = useSharedValue(state.index);
  const shellWidth = Math.min(width - 124, 320);
  const indicatorWidth = (shellWidth - 14) / state.routes.length;

  useEffect(() => {
    indicatorIndex.value = withSpring(state.index, {
      damping: 18,
      stiffness: 240,
      mass: 0.8,
    });
  }, [indicatorIndex, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * indicatorWidth }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}
    >
      <View style={styles.row}>
        <View style={[styles.shellShadow, { width: shellWidth }]}>
          <BlurView intensity={72} tint="light" style={[styles.shell, { width: shellWidth }]}>
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

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            triggerSelectionHaptic();
            router.push('/camera');
          }}
          style={styles.cameraShadow}
        >
          <BlurView intensity={84} tint="light" style={styles.cameraButton}>
            <View style={styles.cameraCore}>
              <View style={styles.cameraLens} />
            </View>
          </BlurView>
        </Pressable>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shellShadow: {
    borderRadius: 999,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  shell: {
    height: 66,
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.tabBar,
  },
  indicator: {
    position: 'absolute',
    top: 7,
    bottom: 7,
    left: 7,
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
    letterSpacing: 0.2,
  },
  tabLabelActive: {
    color: Colors.tabIconActive,
  },
  cameraShadow: {
    borderRadius: 28,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  cameraButton: {
    width: 72,
    height: 72,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: Colors.surface,
  },
  cameraCore: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.text,
  },
});
