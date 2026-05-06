import { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export const ONBOARDING_KEY = '@upi_onboarding_done';

const slides = [
  {
    icon: 'message-text-outline' as const,
    color: '#6200ee',
    title: 'Auto-detect Payments',
    body: 'UPI Tracker reads your bank SMS messages and automatically imports every UPI payment — no manual entry needed.',
  },
  {
    icon: 'chart-pie' as const,
    color: '#0077cc',
    title: 'Track by Category',
    body: 'Every payment is sorted into Food, Transport, Shopping and more so you always know where your money is going.',
  },
  {
    icon: 'bullseye-arrow' as const,
    color: '#2e7d32',
    title: 'Set Monthly Budgets',
    body: 'Set a spending limit for each category. The Stats tab shows how close you are and warns you when you\'re over.',
  },
];

export default function Onboarding() {
  const scroll = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const goTo = (index: number) => {
    scroll.current?.scrollTo({ x: index * width, animated: true });
    setPage(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    router.replace('/(auth)/sign-in');
  };

  const isLast = page === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((s, i) => (
          <View key={i} style={styles.slide}>
            <View style={[styles.iconCircle, { backgroundColor: `${s.color}18` }]}>
              <MaterialCommunityIcons name={s.icon} size={72} color={s.color} />
            </View>
            <Text variant="headlineSmall" style={styles.title}>{s.title}</Text>
            <Text variant="bodyLarge" style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={finish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slides[page].color }]}
          onPress={() => isLast ? finish() : goTo(page + 1)}
          activeOpacity={0.85}
        >
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next'}</Text>
          <MaterialCommunityIcons
            name={isLast ? 'check' : 'arrow-right'}
            size={18}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
  },
  iconCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center' },
  body: { color: '#666', textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  dotActive: { width: 24, backgroundColor: '#6200ee' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  skip: { color: '#aaa', fontSize: 15, fontWeight: '500' },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
