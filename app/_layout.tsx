import { useEffect } from 'react';
import { ClerkProvider, ClerkLoaded, useAuth, useSession, useClerk } from '@clerk/clerk-expo';
import { tokenCache } from '@/services/clerkTokenCache';
import { setTokenProvider, setAuthState, onUnauthorized } from '@/services/api';
import { showToast } from '@/services/toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import ServerWakingBanner from '@/components/ServerWakingBanner';
import Toast from '@/components/Toast';
import QueryProvider from '@/providers/QueryProvider';
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, configureFonts } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import {
  GeistMono_400Regular,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from '@expo-google-fonts/geist-mono';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.bg,
    surface: colors.surface,
    surfaceVariant: colors.surfaceElevated,
    onSurface: colors.text,
    onBackground: colors.text,
  },
  fonts: configureFonts({
    config: {
      displayLarge: { fontFamily: 'Inter_800ExtraBold' },
      displayMedium: { fontFamily: 'Inter_700Bold' },
      displaySmall: { fontFamily: 'Inter_700Bold' },
      headlineLarge: { fontFamily: 'Inter_800ExtraBold' },
      headlineMedium: { fontFamily: 'Inter_700Bold' },
      headlineSmall: { fontFamily: 'Inter_600SemiBold' },
      titleLarge: { fontFamily: 'Inter_700Bold' },
      titleMedium: { fontFamily: 'Inter_600SemiBold' },
      titleSmall: { fontFamily: 'Inter_600SemiBold' },
      bodyLarge: { fontFamily: 'Inter_400Regular' },
      bodyMedium: { fontFamily: 'Inter_400Regular' },
      bodySmall: { fontFamily: 'Inter_400Regular' },
      labelLarge: { fontFamily: 'Inter_600SemiBold' },
      labelMedium: { fontFamily: 'Inter_500Medium' },
      labelSmall: { fontFamily: 'Inter_500Medium' },
    },
  }),
};

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGuard() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const timeout = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      const inOnboarding = segments[0] === 'onboarding';
      const inSsoCallback = segments[0] === 'sso-callback';

      if (inOnboarding || inSsoCallback) return;

      if (isSignedIn && inAuthGroup) {
        router.replace('/(tabs)/');
      } else if (!isSignedIn && !inAuthGroup) {
        router.replace('/(auth)/sign-in');
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn, segments, router]);

  useEffect(() => {
    return onUnauthorized(async () => {
      if (!isSignedIn) return;
      try {
        await signOut();
      } catch {}
      showToast('Session expired. Please sign in again.', 'info');
    });
  }, [isSignedIn, signOut]);

  return null;
}

function TokenSetup() {
  const { getToken: getTokenFromAuth, isSignedIn, isLoaded } = useAuth();
  const { session } = useSession();
  const clerk = useClerk();

  setAuthState(isLoaded, !!isSignedIn);

  setTokenProvider(async () => {
    try {
      const t = await getTokenFromAuth({ skipCache: true });
      if (t) return t;
    } catch {}
    try {
      const t = await getTokenFromAuth();
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
        <QueryProvider>
          <TokenSetup />
          <AuthGuard />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PaperProvider theme={theme}>
              <ErrorBoundary>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.bg },
                  }}
                >
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="sso-callback" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen
                    name="transaction-detail"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen
                    name="edit-transaction"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen
                    name="categorize"
                    options={{ presentation: 'modal', headerShown: false }}
                  />
                  <Stack.Screen name="transactions-month" options={{ headerShown: false }} />
                  <Stack.Screen name="category-rules" options={{ headerShown: false }} />
                  <Stack.Screen name="export" options={{ headerShown: false }} />
                </Stack>
              </ErrorBoundary>
              <ServerWakingBanner />
              <Toast />
            </PaperProvider>
          </GestureHandlerRootView>
        </QueryProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
