import { useAuth } from "@clerk/clerk-expo";
import { Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import AnimatedTabBar from "@/components/AnimatedTabBar";
import FloatingAddButton from "@/components/FloatingAddButton";
import { colors } from "@/constants/theme";

export default function TabsLayout() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="activity" options={{ title: "Activity" }} />
        <Tabs.Screen name="history" options={{ title: "History" }} />
        <Tabs.Screen name="stats" options={{ title: "Insights" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
        <Tabs.Screen name="add" options={{ href: null }} />
      </Tabs>
      <FloatingAddButton />
    </View>
  );
}
