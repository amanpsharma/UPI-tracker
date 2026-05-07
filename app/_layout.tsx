import { useEffect } from "react";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { tokenCache } from "@/services/clerkTokenCache";
import { Stack } from "expo-router";
import {
  PaperProvider,
  MD3LightTheme,
  configureFonts,
} from "react-native-paper";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: "#6200ee", secondary: "#03dac6" },
  fonts: configureFonts({
    config: {
      fontFamily: "Poppins_400Regular",
    },
  }),
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PaperProvider theme={theme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="sso-callback" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen
                name="transaction-detail"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="edit-transaction"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="transactions-month"
                options={{ headerShown: false }}
              />
            </Stack>
          </PaperProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
