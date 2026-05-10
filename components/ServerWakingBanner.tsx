import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { subscribeServerStatus } from '@/services/serverStatus';

// Slim banner that shows at the top whenever an API request is taking long
// enough that the user might think the app is broken (Render cold start, etc.).
export default function ServerWakingBanner() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => subscribeServerStatus(setIsSlow), []);

  if (!isSlow) return null;

  return (
    <View style={styles.banner} pointerEvents="none">
      <ActivityIndicator size="small" color="#fff" />
      <Text style={styles.text}>Waking up server… first request may take ~10s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#111827',
    paddingTop: 50, paddingBottom: 10, paddingHorizontal: 16,
    zIndex: 9999,
  },
  text: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
