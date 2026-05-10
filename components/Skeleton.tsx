import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleSheet } from 'react-native';

// Pulsing rectangle used as a placeholder while data loads. Composes naturally:
// a screen renders a tree of <Skeleton width={...} height={...} /> blocks
// shaped like the eventual content, and the user sees motion instead of a
// blank spinner while the fetch resolves.
type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export default function Skeleton({ width = '100%', height = 14, radius = 6, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

// Pre-composed skeleton for a single transaction row (avatar + 2 lines + amount)
export function SkeletonTxRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={42} height={42} radius={21} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="65%" height={13} />
        <Skeleton width="45%" height={11} />
      </View>
      <Skeleton width={60} height={14} />
    </View>
  );
}

// Pre-composed skeleton for a card (used for stats/insights tiles)
export function SkeletonCard({ height = 88 }: { height?: number }) {
  return <Skeleton height={height} radius={16} style={{ marginBottom: 12 }} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: '#e5e7eb' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
});
