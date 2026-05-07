import { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');
export const ONBOARDING_KEY = '@upi_onboarding_done';

// ── Logo Component ─────────────────────────────────────────────
function AppLogo({ size = 96 }: { size?: number }) {
  const radius = size * 0.22;
  return (
    <View style={{
      width: size, height: size, borderRadius: radius,
      backgroundColor: '#111827',
      justifyContent: 'center', alignItems: 'center',
    }}>
      <Text style={{ color: '#fff', fontSize: size * 0.44, fontWeight: '800', lineHeight: size * 0.52 }}>₹</Text>
      <View style={{
        position: 'absolute', bottom: size * 0.1, right: size * 0.08,
        backgroundColor: '#22c55e', borderRadius: size * 0.1,
        width: size * 0.3, height: size * 0.3,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <MaterialCommunityIcons name="trending-up" size={size * 0.18} color="#fff" />
      </View>
    </View>
  );
}

// ── Slides ─────────────────────────────────────────────────────
type Slide =
  | { type: 'brand' }
  | { type: 'feature'; icon: string; accent: string; title: string; body: string };

const slides: Slide[] = [
  { type: 'brand' },
  {
    type: 'feature',
    icon: 'message-text-outline',
    accent: '#22c55e',
    title: 'Auto-detect Payments',
    body: 'UPI Tracker reads your bank SMS messages and automatically imports every UPI payment — no manual entry needed.',
  },
  {
    type: 'feature',
    icon: 'chart-donut-variant',
    accent: '#3b82f6',
    title: 'Insights at a Glance',
    body: 'See exactly where your money goes — by category, month, and trend. Every rupee, accounted for.',
  },
];

// ── Screen ─────────────────────────────────────────────────────
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
  const isBrand = page === 0;

  return (
    <SafeAreaView style={[styles.root, isBrand && styles.rootDark]}>
      <StatusBar barStyle={isBrand ? 'light-content' : 'dark-content'} />

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => {
          if (slide.type === 'brand') {
            return (
              <View key={i} style={styles.brandSlide}>
                {/* Logo */}
                <AppLogo size={110} />

                {/* Name */}
                <Text style={styles.brandName}>upi.tracker</Text>
                <Text style={styles.brandTagline}>
                  Every rupee, <Text style={styles.brandAccent}>tracked.</Text>
                </Text>
                <Text style={styles.brandSub}>On-device SMS parsing. No cards, no accounts, no servers.</Text>
              </View>
            );
          }

          return (
            <View key={i} style={styles.featureSlide}>
              <View style={[styles.iconWrap, { backgroundColor: `${slide.accent}18` }]}>
                <MaterialCommunityIcons name={slide.icon as any} size={64} color={slide.accent} />
              </View>
              <Text style={styles.featureTitle}>{slide.title}</Text>
              <Text style={styles.featureBody}>{slide.body}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === page && styles.dotActive,
              isBrand && styles.dotDark,
              i === page && isBrand && styles.dotActiveDark,
            ]}
          />
        ))}
      </View>

      {/* Navigation */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={finish} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.skip, isBrand && styles.skipDark]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.nextBtn, isLast && styles.nextBtnFilled]}
          onPress={() => isLast ? finish() : goTo(page + 1)}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextText, isLast && styles.nextTextFilled]}>
            {isLast ? 'Get started' : 'Next'}
          </Text>
          <MaterialCommunityIcons
            name={isLast ? 'arrow-right' : 'arrow-right'}
            size={16}
            color={isLast ? '#fff' : '#111827'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f4f0' },
  rootDark: { backgroundColor: '#111827' },

  // Brand slide
  brandSlide: {
    width, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 16,
  },
  brandName: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginTop: 12,
  },
  brandTagline: {
    fontSize: 20, fontWeight: '700', color: '#fff',
    letterSpacing: -0.3, textAlign: 'center',
  },
  brandAccent: { color: '#22c55e' },
  brandSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 20, marginTop: 4,
  },

  // Feature slides
  featureSlide: {
    width, flex: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, gap: 20,
  },
  iconWrap: {
    width: 130, height: 130, borderRadius: 65,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  featureTitle: {
    fontSize: 26, fontWeight: '800', color: '#111827',
    textAlign: 'center', letterSpacing: -0.5,
  },
  featureBody: {
    fontSize: 15, color: '#6b7280', textAlign: 'center',
    lineHeight: 24,
  },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { width: 22, backgroundColor: '#111827' },
  dotDark: { backgroundColor: 'rgba(255,255,255,0.25)' },
  dotActiveDark: { width: 22, backgroundColor: '#22c55e' },

  // Navigation
  nav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 28, paddingBottom: 28,
  },
  skip: { color: '#9ca3af', fontSize: 15, fontWeight: '600' },
  skipDark: { color: 'rgba(255,255,255,0.4)' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 30,
    paddingHorizontal: 22, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  nextBtnFilled: { backgroundColor: '#111827' },
  nextText: { color: '#111827', fontWeight: '700', fontSize: 15 },
  nextTextFilled: { color: '#fff' },
});
