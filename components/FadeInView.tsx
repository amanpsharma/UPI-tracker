import { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  cancelAnimation,
  useReducedMotion,
  Easing,
} from 'react-native-reanimated';

type Props = {
  delay?: number;
  duration?: number;
  from?: 'bottom' | 'left' | 'right' | 'none';
  distance?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function FadeInView({
  delay = 0,
  duration = 420,
  from = 'bottom',
  distance = 20,
  children,
  style,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(from === 'bottom' ? distance : 0);
  const translateX = useSharedValue(from === 'left' ? -distance : from === 'right' ? distance : 0);
  const scale = useSharedValue(0.985);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      scale.value = 1;
      return;
    }

    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration, easing }));
    if (from === 'bottom') {
      translateY.value = withDelay(delay, withTiming(0, { duration, easing }));
    } else if (from === 'left' || from === 'right') {
      translateX.value = withDelay(delay, withTiming(0, { duration, easing }));
    }
    scale.value = withDelay(delay, withTiming(1, { duration, easing }));

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(scale);
    };
  }, [delay, duration, from, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
