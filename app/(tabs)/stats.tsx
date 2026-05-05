import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Stats } from '@/types';

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api.getStats().then((s) => { setStats(s); setLoading(false); });
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
      </SafeAreaView>
    );
  }

  const maxAmount = Math.max(...(stats?.byCategory.map((c) => c.total) ?? [1]), 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineSmall" style={styles.heading}>
          Spending Stats
        </Text>

        {/* Summary cards */}
        <View style={styles.row}>
          <Surface style={[styles.statCard, { backgroundColor: '#6200ee' }]} elevation={2}>
            <Text style={styles.cardLabel}>This month</Text>
            <Text style={styles.cardAmount}>
              ₹{(stats?.thisMonth.total ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.cardCount}>{stats?.thisMonth.count} payments</Text>
          </Surface>
          <Surface style={[styles.statCard, { backgroundColor: '#03dac6' }]} elevation={2}>
            <Text style={styles.cardLabel}>All time</Text>
            <Text style={styles.cardAmount}>
              ₹{(stats?.allTime.total ?? 0).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.cardCount}>{stats?.allTime.count} payments</Text>
          </Surface>
        </View>

        {/* Category bar chart */}
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Spending by category
        </Text>

        {stats?.byCategory.length === 0 ? (
          <Text style={styles.empty}>No data yet.</Text>
        ) : (
          stats?.byCategory.map((c) => {
            const pct = (c.total / maxAmount) * 100;
            return (
              <View key={c._id} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <MaterialCommunityIcons
                    name={CATEGORY_ICONS[c._id] as any}
                    size={16}
                    color={CATEGORY_COLORS[c._id]}
                  />
                  <Text variant="bodySmall" style={styles.catName}>
                    {c._id}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[c._id] },
                    ]}
                  />
                </View>
                <Text variant="bodySmall" style={styles.barAmount}>
                  ₹{c.total.toLocaleString('en-IN')}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 16 },
  heading: { fontWeight: 'bold', color: '#6200ee' },
  row: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  cardAmount: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginVertical: 4 },
  cardCount: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  sectionTitle: { fontWeight: '600' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 80, flexDirection: 'row', alignItems: 'center', gap: 4 },
  catName: { color: '#444', fontSize: 11 },
  barTrack: { flex: 1, height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 6 },
  barAmount: { width: 70, textAlign: 'right', color: '#333', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
});
