import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

type TabItem = {
  name: string;
  label: string;
  icon: string;
  iconFocused: string;
};

const TABS: TabItem[] = [
  { name: "index", label: "Home", icon: "home-outline", iconFocused: "home" },
  { name: "activity", label: "Activity", icon: "format-list-bulleted", iconFocused: "format-list-bulleted" },
  { name: "history", label: "History", icon: "calendar-month-outline", iconFocused: "calendar-month" },
  { name: "stats", label: "Insights", icon: "chart-donut-variant", iconFocused: "chart-donut-variant" },
  { name: "settings", label: "Settings", icon: "account-circle-outline", iconFocused: "account-circle" },
];

function TabButton({
  tab,
  focused,
  onPress,
}: {
  tab: TabItem;
  focused: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(focused ? 1 : 0.9);
  const labelOpacity = useSharedValue(focused ? 1 : 0.6);

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1 : 0.9, { damping: 12, stiffness: 180 });
    labelOpacity.value = withTiming(focused ? 1 : 0.6, { duration: 200 });
  }, [focused]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const handlePress = () => {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 300 }, () => {
      scale.value = withSpring(1, { damping: 8, stiffness: 200 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, containerStyle]}>
        <Animated.View style={[styles.iconWrap, focused && styles.iconWrapActive, iconContainerStyle]}>
          <MaterialCommunityIcons
            name={(focused ? tab.iconFocused : tab.icon) as any}
            size={24}
            color={focused ? "#111827" : "#9ca3af"}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.label,
            focused && styles.labelActive,
            labelStyle,
          ]}
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
}: any) {
  return (
    <View style={styles.container}>
      {state.routes
        .filter((route: any) => {
          const tab = TABS.find((t) => t.name === route.name);
          return !!tab;
        })
        .map((route: any, index: number) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;

          const focused = state.index === state.routes.indexOf(route);

          return (
            <TabButton
              key={route.key}
              tab={tab}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopColor: "#f3f4f6",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 24 : 10,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  tabContent: {
    alignItems: "center",
    gap: 3,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#f0f0f0",
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: "#9ca3af",
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    color: "#111827",
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
