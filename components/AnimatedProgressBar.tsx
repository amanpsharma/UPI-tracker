import { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  percent: number;
  color: string;
  trackColor: string;
  height?: number;
  delay?: number;
  style?: ViewStyle;
};

export default function AnimatedProgressBar({
  percent,
  color,
  trackColor,
  height = 6,
  delay = 0,
  style,
}: Props) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const target = Math.min(100, Math.max(0, percent));

  useEffect(() => {
    if (reduceMotion) {
      progress.value = target;
      return;
    }

    progress.value = withDelay(delay, withTiming(target, { duration: 620 }));
    return () => cancelAnimation(progress);
  }, [delay, reduceMotion, target]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor, borderRadius: height / 2 },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, backgroundColor: color, borderRadius: height / 2 },
          fillStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { minWidth: 0 },
});
