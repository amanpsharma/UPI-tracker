import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

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

  useEffect(() => {
    const delay = index * 80;
    barHeight.value = withDelay(
      delay,
      withSpring(height, { damping: 12, stiffness: 100, mass: 0.8 }),
    );
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }),
    );
  }, [height]);

  const barStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
    opacity: opacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.col}>
      <Animated.Text style={[styles.valueLabel, labelStyle]}>
        {valueLabel}
      </Animated.Text>
      <Animated.View
        style={[
          styles.bar,
          { backgroundColor: color },
          barStyle,
        ]}
      />
      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  bar: {
    width: "60%",
    borderRadius: 8,
    minHeight: 4,
  },
  valueLabel: {
    fontSize: 9,
    color: "#8F95A8",
    fontFamily: "Inter_400Regular",
    marginBottom: 3,
    textAlign: "center",
  },
  dayLabel: {
    fontSize: 10,
    color: "#8F95A8",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  dayLabelToday: {
    color: "#6366F1",
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
