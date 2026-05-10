import { useEffect } from 'react';
import { View, ViewStyle, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

type Props = {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export default function Skeleton({ width = '100%', height = 14, radius = 6, style }: Props) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius: radius },
        animatedStyle,
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
