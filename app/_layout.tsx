import { useEffect } from "react";
import {
  ClerkProvider,
  ClerkLoaded,
  useAuth,
  useUser,
  useSession,
  useClerk,
} from "@clerk/clerk-expo";
import { tokenCache } from "@/services/clerkTokenCache";
import { setTokenProvider, setUserId } from "@/services/api";
import { Stack, useRouter, useSegments } from "expo-router";
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

// Single source of truth for auth-based routing. Fires AFTER render commits so
// Clerk's state is stable — eliminates the redirect race that caused the loop
// between (auth) and (tabs) layouts.
function AuthGuard() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inSsoCallback = segments[0] === 'sso-callback';

    // Allow onboarding & SSO callback to render regardless of auth state
    if (inOnboarding || inSsoCallback) return;

    if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)/');
    } else if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [isLoaded, isSignedIn, segments, router]);

  return null;
}

// Wires up the userId for API requests on every render. Tries every Clerk API
// available because useAuth().userId has been observed to stay null even when
// the user is signed in. Whichever source has a value first wins.
function TokenSetup() {
  const { getToken: getTokenFromAuth, userId: authUserId, isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { session } = useSession();
  const clerk = useClerk();

  const resolvedId =
    authUserId ||
    user?.id ||
    session?.user?.id ||
    clerk?.user?.id ||
    clerk?.session?.user?.id ||
    null;

  console.log(
    '[TokenSetup] isLoaded=', isLoaded,
    'isSignedIn=', isSignedIn,
    'authUserId=', authUserId,
    'user?.id=', user?.id,
    'session?.user?.id=', session?.user?.id,
    'clerk?.user?.id=', clerk?.user?.id,
    '→ resolvedId=', resolvedId,
  );

  // Only clobber _userId if we are SURE the user is signed out.
  // Otherwise update with whatever we have (or keep previous if all null in a transient render).
  if (resolvedId) {
    setUserId(resolvedId);
  } else if (isLoaded && isSignedIn === false) {
    setUserId(null);
  }

  setTokenProvider(async () => {
    try {
      const t = await getTokenFromAuth();
      if (t) return t;
    } catch {}
    try {
      const t = await getTokenFromAuth({ skipCache: true });
      if (t) return t;
    } catch {}
    if (session) {
      try {
        const t = await session.getToken({ skipCache: true });
        if (t) return t;
      } catch {}
    }
    if (clerk?.session) {
      try {
        const t = await clerk.session.getToken({ skipCache: true });
        if (t) return t;
      } catch {}
    }
    return null;
  });

  return null;
}

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
        <TokenSetup />
        <AuthGuard />
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
