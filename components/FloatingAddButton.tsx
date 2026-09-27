import { useEffect } from "react";
import { StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import PressableScale from "./PressableScale";
import { colors, radius } from "@/constants/theme";

export default function FloatingAddButton() {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(600, withSpring(1, { damping: 10, stiffness: 150 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rotate.value = withSequence(
      withTiming(90, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 150, easing: Easing.in(Easing.cubic) }),
    );
    router.push("/(tabs)/add");
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <PressableScale
        style={styles.button}
        onPress={handlePress}
        scaleDown={0.88}
      >
        <MaterialCommunityIcons name="plus" size={26} color="#fff" />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 90 : 70,
    right: 20,
    zIndex: 100,
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});
