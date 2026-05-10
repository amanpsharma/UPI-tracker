import React from 'react';
import { Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

type AnimatedButtonProps = PressableProps & {
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  activeOpacity?: number;
  children: React.ReactNode;
};

export default function AnimatedButton({ 
  style, 
  activeScale = 0.96, 
  activeOpacity = 0.8,
  children,
  onPressIn,
  onPressOut,
  ...props 
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = (e: any) => {
    scale.value = withSpring(activeScale, { mass: 0.5, damping: 10, stiffness: 200 });
    opacity.value = withSpring(activeOpacity);
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { mass: 0.5, damping: 10, stiffness: 200 });
    opacity.value = withSpring(1);
    if (onPressOut) onPressOut(e);
  };

  const reanimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableComponent
      {...props}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, reanimatedStyle]}
    >
      {children}
    </AnimatedPressableComponent>
  );
}