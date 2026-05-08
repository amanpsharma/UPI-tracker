import { Stack } from 'expo-router';

// AuthGuard in app/_layout.tsx handles "signed-in user on auth screens → /(tabs)/" routing.
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
