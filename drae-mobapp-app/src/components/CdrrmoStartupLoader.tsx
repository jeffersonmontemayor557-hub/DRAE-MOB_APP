import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const LOGO = require('../../assets/cdr-logo.png');

/** Minimum time the startup loader is shown (matches web). */
export const STARTUP_LOADER_MS = 1500;

export default function CdrrmoStartupLoader() {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, duration: number, reverse = false) =>
      Animated.loop(
        Animated.timing(v, {
          toValue: 1,
          duration,
          easing: Easing.bezier(0.6, 0.1, 0.4, 0.9),
          useNativeDriver: true,
        }),
      );

    const a1 = loop(r1, 1200);
    const a2 = loop(r2, 1800);
    const a3 = loop(r3, 2400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [r1, r2, r3]);

  const rot1 = r1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rot2 = r2.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const rot3 = r3.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root} accessibilityLabel="Loading">
      <View style={styles.spinnerWrap}>
        <View style={[styles.arc, styles.arcTrack]} />
        <Animated.View style={[styles.arc, styles.arcRed, { transform: [{ rotate: rot1 }] }]} />
        <Animated.View style={[styles.arc, styles.arcGreen, { transform: [{ rotate: rot2 }] }]} />
        <Animated.View style={[styles.arc, styles.arcYellow, { transform: [{ rotate: rot3 }] }]} />
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="CDRRMO" />
      </View>
    </View>
  );
}

const SIZE = 100;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    position: 'absolute',
    borderRadius: SIZE / 2,
  },
  arcTrack: {
    width: SIZE,
    height: SIZE,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  arcRed: {
    width: SIZE,
    height: SIZE,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#e02020',
    borderRightColor: '#e02020',
  },
  arcGreen: {
    width: SIZE - 16,
    height: SIZE - 16,
    left: 8,
    top: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    borderBottomColor: '#2a9c2a',
    borderLeftColor: '#2a9c2a',
  },
  arcYellow: {
    width: SIZE - 32,
    height: SIZE - 32,
    left: 16,
    top: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderTopColor: '#e6c800',
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 2,
  },
});
