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
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 95 : 75,
    right: 20,
    zIndex: 100,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
