import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format, parseISO, addMonths, subMonths, isSameMonth } from 'date-fns';
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

function fmtFull(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

const TODAY = new Date();

export default function InsightsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isCurrentMonth = isSameMonth(selectedDate, TODAY);
  const monthParam = format(selectedDate, 'yyyy-MM');

  const load = useCallback(async () => {
    try {
      setError('');
      const s = await api.getStats(format(selectedDate, 'yyyy-MM'));
      setStats(s);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load insights.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthParam]);

  // Re-fetch when month changes (load recreated due to monthParam dependency)
  useEffect(() => { load(); }, [load]);
  // Also re-fetch silently when tab regains focus (e.g. after editing a transaction category)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const prevMonth = () => { setStats(null); setSelectedDate((d) => subMonths(d, 1)); };
  const nextMonth = () => { if (!isCurrentMonth) { setStats(null); setSelectedDate((d) => addMonths(d, 1)); } };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color="#111827" /></View>
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

  const sent = stats?.thisMonth.sent ?? 0;
  const received = stats?.thisMonth.received ?? 0;
  const sentCount = stats?.thisMonth.sentCount ?? 0;
  const receivedCount = stats?.thisMonth.receivedCount ?? 0;
  const net = received - sent;
  const byCategory = stats?.byCategory ?? [];

  const catData = byCategory.filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  const pieData = catData.map((c) => ({
    value: c.total,
    color: CATEGORY_COLORS[c._id] ?? '#A0A0A0',
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <TouchableOpacity style={styles.gearBtn} onPress={() => router.push('/(tabs)/settings')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="cog-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.7}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(selectedDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
            onPress={nextMonth}
            activeOpacity={isCurrentMonth ? 1 : 0.7}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={isCurrentMonth ? '#d1d5db' : '#111827'} />
          </TouchableOpacity>
        </View>

        {/* Summary cards row */}
        <View style={styles.summaryRow}>
          {/* Sent card */}
          <View style={[styles.summaryCard, styles.sentCard]}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: '#fee2e2' }]}>
                <MaterialCommunityIcons name="arrow-up" size={14} color="#dc2626" />
              </View>
              <Text style={styles.summaryLabel}>SENT</Text>
            </View>
            <Text style={styles.sentAmount}>{fmtShort(sent)}</Text>
            <Text style={styles.summaryCount}>{sentCount} txns</Text>
          </View>

          {/* Received card */}
          <View style={[styles.summaryCard, styles.receivedCard]}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="arrow-down" size={14} color="#16a34a" />
              </View>
              <Text style={styles.summaryLabel}>RECEIVED</Text>
            </View>
            <Text style={styles.receivedAmount}>{fmtShort(received)}</Text>
            <Text style={styles.summaryCount}>{receivedCount} txns</Text>
          </View>
        </View>

        {/* Net balance card */}
        <View style={styles.netCard}>
          <View style={styles.netLeft}>
            <Text style={styles.netLabel}>NET BALANCE</Text>
            <Text style={[styles.netAmount, { color: net >= 0 ? '#16a34a' : '#dc2626' }]}>
              {net >= 0 ? '+' : '-'}{fmtFull(Math.abs(net))}
            </Text>
          </View>
          <View style={styles.netRight}>
            <MaterialCommunityIcons
              name={net >= 0 ? 'trending-up' : 'trending-down'}
              size={32}
              color={net >= 0 ? '#16a34a' : '#dc2626'}
            />
          </View>
        </View>

        {/* Donut card */}
        {pieData.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>SPENDING BREAKDOWN</Text>
            </View>

            <View style={styles.donutCard}>
              <View style={styles.chartRow}>
                <PieChart
                  data={pieData}
                  donut
                  radius={78}
                  innerRadius={52}
                  centerLabelComponent={() => (
                    <View style={styles.centerLabel}>
                      <Text style={styles.centerLabelTop}>Spent</Text>
                      <Text style={styles.centerLabelAmt}>{fmtShort(sent)}</Text>
                    </View>
                  )}
                />
                <View style={styles.legend}>
                  {catData.map((c) => {
                    const pct = sent > 0 ? Math.round((c.total / sent) * 100) : 0;
                    return (
                      <View key={c._id} style={styles.legendRow}>
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[c._id] ?? '#A0A0A0' }]} />
                        <Text style={styles.legendName} numberOfLines={1}>{CAT_DISPLAY[c._id] ?? c._id}</Text>
                        <Text style={styles.legendPct}>{pct}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </>
        )}

        {/* By category list */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>BY CATEGORY</Text>
          <TouchableOpacity onPress={() => Alert.alert('Rules', 'Auto-categorisation rules coming soon.')}>
            <Text style={styles.rulesLink}>Rules →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.catCard}>
          {catData.length === 0 ? (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-donut-variant" size={40} color="#e5e7eb" />
              <Text style={styles.emptyText}>No spending this month</Text>
            </View>
          ) : (
            catData.map((c, idx) => {
              const pct = sent > 0 ? (c.total / sent) * 100 : 0;
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

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  gearBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginTop: 4,
  },

  // Month navigator
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 20,
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: '#fafafa' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#111827', minWidth: 130, textAlign: 'center' },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  sentCard: { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  receivedCard: { borderLeftWidth: 3, borderLeftColor: '#16a34a' },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  summaryIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8 },
  sentAmount: { fontSize: 22, fontWeight: '800', color: '#dc2626', letterSpacing: -0.5, marginBottom: 4, fontFamily: 'GeistMono_700Bold' },
  receivedAmount: { fontSize: 22, fontWeight: '800', color: '#16a34a', letterSpacing: -0.5, marginBottom: 4, fontFamily: 'GeistMono_700Bold' },
  summaryCount: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  // Net card
  netCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  netLeft: { gap: 4 },
  netLabel: { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8 },
  netAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontFamily: 'GeistMono_700Bold' },
  netRight: {},

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1 },
  rulesLink: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Donut card
  donutCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, marginBottom: 24,
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  centerLabel: { alignItems: 'center' },
  centerLabelTop: { fontSize: 9, color: '#9ca3af', fontWeight: '500', textAlign: 'center' },
  centerLabelAmt: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center', fontFamily: 'GeistMono_700Bold' },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  legendName: { flex: 1, fontSize: 12, color: '#374151', fontWeight: '500' },
  legendPct: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },

  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  // Category list
  catCard: {
    backgroundColor: '#fff', borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2, overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  catInfo: { flex: 1, gap: 8 },
  catTopRow: { flexDirection: 'row', alignItems: 'center' },
  catName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catAmount: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'GeistMono_700Bold' },
  catPct: { fontSize: 12, color: '#9ca3af', fontWeight: '500', minWidth: 32, textAlign: 'right' },
  barTrack: { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
});
