import { useAuth } from "@clerk/clerk-expo";
import { Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AnimatedTabBar from "@/components/AnimatedTabBar";
import FloatingAddButton from "@/components/FloatingAddButton";

// AuthGuard in app/_layout.tsx handles "signed-out user on tabs → /(auth)/sign-in" routing.
export default function TabsLayout() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f4f0",
        }}
      >
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
