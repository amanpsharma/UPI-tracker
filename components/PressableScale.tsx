import React from "react";
import { Pressable, PressableProps, ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  scaleDown?: number;
};

export default function PressableScale({
  style,
  children,
  scaleDown = 0.97,
  ...props
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        scale.value = withSpring(scaleDown, { damping: 15, stiffness: 300 });
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
        props.onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
