import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';

export function Atmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, styles.orbPeach]} />
      <View style={[styles.orb, styles.orbMint]} />
      <View style={[styles.orb, styles.orbSky]} />
      <View style={styles.mesh} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPeach: {
    top: -48,
    right: -30,
    width: 220,
    height: 220,
    backgroundColor: Colors.glowPeach,
  },
  orbMint: {
    top: 240,
    left: -90,
    width: 240,
    height: 240,
    backgroundColor: Colors.glowMint,
  },
  orbSky: {
    bottom: 120,
    right: -56,
    width: 200,
    height: 200,
    backgroundColor: Colors.glowSky,
  },
  mesh: {
    position: 'absolute',
    inset: 16,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.frame,
    opacity: 0.45,
  },
});
