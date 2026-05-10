import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { subscribeToast, ToastMessage } from '@/services/toast';

const VARIANT = {
  success: { bg: '#16a34a', icon: 'check-circle' as const },
  error: { bg: '#dc2626', icon: 'alert-circle' as const },
  info: { bg: '#111827', icon: 'information' as const },
};

const SHOW_MS = 2200;

export default function Toast() {
  const [msg, setMsg] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    return subscribeToast((next) => {
      setMsg(next);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 8 }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
        ]).start(() => setMsg(null));
      }, SHOW_MS);

      return () => clearTimeout(timer);
    });
  }, [opacity, translateY]);

  if (!msg) return null;

  const v = VARIANT[msg.variant];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        { backgroundColor: v.bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <MaterialCommunityIcons name={v.icon} size={18} color="#fff" />
      <Text style={styles.text} numberOfLines={2}>{msg.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 28,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10000,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
