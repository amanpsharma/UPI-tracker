import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Stats, Category } from '@/types';

const BG = '#f5f4f0';

const CAT_DISPLAY: Partial<Record<Category, string>> = {
  Food: 'Food & Dining',
  Bills: 'Bills & Utilities',
  Transport: 'Transport',
  Shopping: 'Shopping',
  Entertainment: 'Entertainment',
  Health: 'Health',
  Other: 'Other',
};

function fmtShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

export default function InsightsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const s = await api.getStats();
      setStats(s);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load insights.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#111827" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color="#e5e7eb" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSpent = stats?.thisMonth.total ?? 0;
  const byCategory = stats?.byCategory ?? [];

  // Build pie data — only categories with spending
  const catData = byCategory
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const pieData = catData.map((c) => ({
    value: c.total,
    color: CATEGORY_COLORS[c._id] ?? '#A0A0A0',
    focused: false,
  }));

  const monthLabel = format(new Date(), 'MMMM yyyy');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.gearBtn}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cog-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Donut card */}
        <View style={styles.donutCard}>
          <Text style={styles.totalLabel}>TOTAL SPENT</Text>
          <Text style={styles.totalAmount}>-{fmtShort(totalSpent)}</Text>

          {pieData.length > 0 ? (
            <View style={styles.chartRow}>
              {/* Donut */}
              <PieChart
                data={pieData}
                donut
                radius={78}
                innerRadius={52}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelTop}>This month</Text>
                    <Text style={styles.centerLabelAmt}>-{fmtShort(totalSpent)}</Text>
                  </View>
                )}
              />

              {/* Legend */}
              <View style={styles.legend}>
                {catData.map((c) => {
                  const pct = totalSpent > 0 ? Math.round((c.total / totalSpent) * 100) : 0;
                  return (
                    <View key={c._id} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[c._id] ?? '#A0A0A0' }]} />
                      <Text style={styles.legendName} numberOfLines={1}>
                        {CAT_DISPLAY[c._id] ?? c._id}
                      </Text>
                      <Text style={styles.legendPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-donut-variant" size={48} color="#e5e7eb" />
              <Text style={styles.emptyText}>No spending this month</Text>
            </View>
          )}
        </View>

        {/* By category section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>BY CATEGORY</Text>
          <TouchableOpacity onPress={() => Alert.alert('Rules', 'Auto-categorisation rules coming soon.')}>
            <Text style={styles.rulesLink}>Rules →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.catCard}>
          {catData.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyText}>No transactions this month.</Text>
            </View>
          ) : (
            catData.map((c, idx) => {
              const pct = totalSpent > 0 ? (c.total / totalSpent) * 100 : 0;
              const color = CATEGORY_COLORS[c._id] ?? '#A0A0A0';
              return (
                <View key={c._id} style={[styles.catRow, idx < catData.length - 1 && styles.catRowBorder]}>
                  <View style={[styles.catIcon, { backgroundColor: color }]}>
                    <MaterialCommunityIcons name={CATEGORY_ICONS[c._id] as any} size={14} color="#fff" />
                  </View>
                  <View style={styles.catInfo}>
                    <View style={styles.catTopRow}>
                      <Text style={styles.catName}>{CAT_DISPLAY[c._id] ?? c._id}</Text>
                      <View style={styles.catRight}>
                        <Text style={styles.catAmount}>-{fmtShort(c.total)}</Text>
                        <Text style={styles.catPct}>{Math.round(pct)}%</Text>
                      </View>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: '#ef4444', fontSize: 14, textAlign: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginTop: 2 },
  gearBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    marginTop: 4,
  },

  donutCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    marginBottom: 20,
  },
  totalLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 4 },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 20 },

  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },

  centerLabel: { alignItems: 'center' },
  centerLabelTop: { fontSize: 9, color: '#9ca3af', fontWeight: '500', textAlign: 'center' },
  centerLabelAmt: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },

  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  legendName: { flex: 1, fontSize: 12, color: '#374151', fontWeight: '500' },
  legendPct: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1 },
  rulesLink: { fontSize: 13, fontWeight: '700', color: '#111827' },

  catCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  catInfo: { flex: 1, gap: 8 },
  catTopRow: { flexDirection: 'row', alignItems: 'center' },
  catName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  catPct: { fontSize: 12, color: '#9ca3af', fontWeight: '500', minWidth: 32, textAlign: 'right' },
  barTrack: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});
