import { useRef } from "react";
import { TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Text } from "react-native-paper";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';

interface Props {
  onDelete: () => void;
  onPress: () => void;
  children: React.ReactNode;
  stripped?: boolean;
}

export default function SwipeableRow({ onDelete, onPress, children, stripped }: Props) {
  const ref = useRef<Swipeable>(null);

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    ref.current?.close();
    onDelete();
  };

  const renderRightActions = (
    _prog: Animated.AnimatedInterpolation<number>,
    drag: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = drag.interpolate({
      inputRange: [-90, -20, 0],
      outputRange: [1, 0.9, 0.7],
      extrapolate: "clamp",
    });
    const opacity = drag.interpolate({
      inputRange: [-90, -40, 0],
      outputRange: [1, 1, 0],
      extrapolate: "clamp",
    });
    return (
      <Animated.View style={[styles.deleteAction, { opacity }]}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Animated.View
            style={{ transform: [{ scale }], alignItems: "center" }}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={22}
              color="#fff"
            />
            <Text style={styles.deleteText}>Delete</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={ref}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={stripped ? styles.plain : styles.card}
        activeOpacity={0.75}
        onPress={onPress}
      >
        {children}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  deleteAction: {
    width: 80,
    borderRadius: 16,
    overflow: "hidden",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 4,
  },
  deleteText: { color: "#fff", fontSize: 12, marginTop: 4, fontWeight: "600" },
  plain: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff" },
});
