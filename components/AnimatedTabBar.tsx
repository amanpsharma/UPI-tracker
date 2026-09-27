import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, fonts, radius } from "@/constants/theme";

type TabItem = {
  name: string;
  label: string;
  icon: string;
  iconFocused: string;
};

const TABS: TabItem[] = [
  { name: "index", label: "Home", icon: "home-outline", iconFocused: "home" },
  { name: "activity", label: "Activity", icon: "swap-horizontal", iconFocused: "swap-horizontal" },
  { name: "history", label: "History", icon: "calendar-month-outline", iconFocused: "calendar-month" },
  { name: "stats", label: "Insights", icon: "chart-arc", iconFocused: "chart-arc" },
  { name: "settings", label: "Profile", icon: "account-outline", iconFocused: "account" },
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
  const iconTranslateY = useSharedValue(focused ? -2 : 0);
  const indicatorWidth = useSharedValue(focused ? 18 : 0);

  useEffect(() => {
    iconTranslateY.value = withSpring(focused ? -2 : 0, { damping: 14, stiffness: 200 });
    indicatorWidth.value = withSpring(focused ? 18 : 0, { damping: 14, stiffness: 200 });
  }, [focused]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: iconTranslateY.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    opacity: indicatorWidth.value > 0 ? 1 : 0,
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
        <Animated.View style={[focused && styles.iconBg, iconStyle]}>
          <MaterialCommunityIcons
            name={(focused ? tab.iconFocused : tab.icon) as any}
            size={22}
            color={focused ? colors.primary : colors.textMuted}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.label,
            focused && styles.labelActive,
          ]}
        >
          {tab.label}
        </Animated.Text>
        <Animated.View style={[styles.indicator, indicatorStyle]} />
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
      <View style={styles.inner}>
        {state.routes
          .filter((route: any) => {
            const tab = TABS.find((t) => t.name === route.name);
            return !!tab;
          })
          .map((route: any) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 6,
    backgroundColor: colors.bg,
  },
  inner: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  tabContent: {
    alignItems: "center",
    gap: 3,
  },
  iconBg: {
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.textMuted,
    fontFamily: fonts.medium,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: "600",
    fontFamily: fonts.semibold,
  },
  indicator: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
