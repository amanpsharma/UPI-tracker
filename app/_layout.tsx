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
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import {
  GeistMono_400Regular,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: "#22c55e", secondary: "#3b82f6" },
  fonts: configureFonts({
    config: {
      displayLarge:   { fontFamily: "Inter_800ExtraBold" },
      displayMedium:  { fontFamily: "Inter_700Bold" },
      displaySmall:   { fontFamily: "Inter_700Bold" },
      headlineLarge:  { fontFamily: "Inter_800ExtraBold" },
      headlineMedium: { fontFamily: "Inter_700Bold" },
      headlineSmall:  { fontFamily: "Inter_600SemiBold" },
      titleLarge:     { fontFamily: "Inter_700Bold" },
      titleMedium:    { fontFamily: "Inter_600SemiBold" },
      titleSmall:     { fontFamily: "Inter_600SemiBold" },
      bodyLarge:      { fontFamily: "Inter_400Regular" },
      bodyMedium:     { fontFamily: "Inter_400Regular" },
      bodySmall:      { fontFamily: "Inter_400Regular" },
      labelLarge:     { fontFamily: "Inter_600SemiBold" },
      labelMedium:    { fontFamily: "Inter_500Medium" },
      labelSmall:     { fontFamily: "Inter_500Medium" },
    },
  }),
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    GeistMono_400Regular,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
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
                name="categorize"
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
