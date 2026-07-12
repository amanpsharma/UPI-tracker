import { useEffect } from "react";
import { ViewStyle, StyleProp } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

type Props = {
  delay?: number;
  duration?: number;
  from?: "bottom" | "left" | "right" | "none";
  distance?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function FadeInView({
  delay = 0,
  duration = 500,
  from = "bottom",
  distance = 20,
  children,
  style,
}: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(from === "bottom" ? distance : 0);
  const translateX = useSharedValue(
    from === "left" ? -distance : from === "right" ? distance : 0,
  );

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    if (from === "bottom") {
      translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 120 }));
    } else if (from === "left" || from === "right") {
      translateX.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 120 }));
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
