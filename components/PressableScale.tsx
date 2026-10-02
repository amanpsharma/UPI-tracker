import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleDown?: number;
};

export default function PressableScale({ style, children, scaleDown = 0.97, ...props }: Props) {
  const scale = useSharedValue(1);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.value = reduceMotion
          ? 1
          : withSpring(scaleDown, { damping: 18, stiffness: 320, mass: 0.6 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = reduceMotion ? 1 : withSpring(1, { damping: 16, stiffness: 260, mass: 0.65 });
        props.onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
