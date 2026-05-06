import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_KEY } from './onboarding';

export default function Root() {
  const { isLoaded, isSignedIn } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => setOnboardingDone(!!val));
  }, []);

  if (!isLoaded || onboardingDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href={isSignedIn ? '/(tabs)/' : '/(auth)/sign-in'} />;
}
