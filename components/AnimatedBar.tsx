import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  cancelAnimation,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

type Props = {
  height: number;
  maxHeight: number;
  color: string;
  label: string;
  valueLabel: string;
  index: number;
  isToday?: boolean;
};

export default function AnimatedBar({
  height,
  maxHeight,
  color,
  label,
  valueLabel,
  index,
  isToday = false,
}: Props) {
  const barHeight = useSharedValue(0);
  const opacity = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const targetHeight = Math.min(maxHeight, Math.max(0, height));
    if (reduceMotion) {
      barHeight.value = targetHeight;
      opacity.value = 1;
      return;
    }

    const delay = index * 55;
    barHeight.value = withDelay(
      delay,
      withSpring(targetHeight, { damping: 15, stiffness: 135, mass: 0.7 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
    return () => {
      cancelAnimation(barHeight);
      cancelAnimation(opacity);
    };
  }, [height, index, maxHeight, reduceMotion]);

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
    opacity: opacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.col}>
      <Animated.Text style={[styles.valueLabel, labelStyle]}>{valueLabel}</Animated.Text>
      <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  bar: {
    width: '60%',
    borderRadius: 8,
    minHeight: 4,
  },
  valueLabel: {
    fontSize: 9,
    color: '#8F95A8',
    fontFamily: 'Inter_400Regular',
    marginBottom: 3,
    textAlign: 'center',
  },
  dayLabel: {
    fontSize: 10,
    color: '#8F95A8',
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
  dayLabelToday: {
    color: '#6366F1',
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
});
