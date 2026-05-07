import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenCache } from '@clerk/clerk-expo/dist/cache/types';

// AsyncStorage persists across dev rebuilds on Android.
// SecureStore gets wiped whenever the APK is reinstalled during development.
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    return AsyncStorage.getItem(key);
  },
  async saveToken(key: string, value: string) {
    return AsyncStorage.setItem(key, value);
  },
  async clearToken(key: string) {
    return AsyncStorage.removeItem(key);
  },
};
