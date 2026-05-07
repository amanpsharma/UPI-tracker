import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { CATEGORY_COLORS } from '@/constants';
import { MonthlyData } from '@/types';

const CHART_HEIGHT = 80;

const CAT_DISPLAY: Record<string, string> = {
  Food: 'Food & Dining',
  Transport: 'Transport',
  Shopping: 'Shopping',
  Bills: 'Bills & Utilities',
  Entertainment: 'Entertainment',
  Health: 'Health',
  Other: 'Other',
};

function fmtShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

function getBarLetter(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM')[0];
}

function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM yyyy');
}

export default function HistoryScreen() {
  const [months, setMonths] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await api.getMonthly();
      setMonths(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const currentMonthKey = format(new Date(), 'yyyy-MM');
  const totalSpent = months.reduce((s, m) => s + m.spent, 0);
  const activeMonths = months.filter(m => m.spent > 0);
  const avgMonthly = activeMonths.length > 0 ? totalSpent / activeMonths.length : 0;
  const chartMax = Math.max(...months.map(m => m.spent), 1);

  // Group by year, newest first
  const byYear: Record<string, MonthlyData[]> = {};
  months.forEach(m => {
    const yr = m.month.slice(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(m);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="calendar-month-outline" size={40} color="#e5e7eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            {activeMonths.length} month{activeMonths.length !== 1 ? 's' : ''} · avg -{fmtShort(avgMonthly)}/mo
          </Text>
        </View>

        {/* ── 12-Month Bar Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>LAST 12 MONTHS</Text>
            <Text style={styles.chartAvg}>avg -{fmtShort(avgMonthly)}</Text>
          </View>
          <View style={styles.barsRow}>
            {months.map((m) => {
              const isCurrent = m.month === currentMonthKey;
              const barH = m.spent > 0
                ? Math.max(10, (m.spent / chartMax) * CHART_HEIGHT)
                : 6;
              return (
                <View key={m.month} style={styles.barCol}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barH,
                        backgroundColor: isCurrent ? '#1a1a1a' : '#e5e7eb',
                        opacity: m.spent === 0 && !isCurrent ? 0.4 : 1,
                      },
                    ]}
                  />
                  <Text style={[styles.barLetter, isCurrent && styles.barLetterActive]}>
                    {getBarLetter(m.month)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Year sections ── */}
        {Object.entries(byYear)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([year, yearMonths]) => {
            const yearTotal = yearMonths.reduce((s, m) => s + m.spent, 0);
            return (
              <View key={year} style={styles.yearSection}>
                <View style={styles.yearHeader}>
                  <Text style={styles.yearLabel}>{year}</Text>
                  {yearTotal > 0 && (
                    <Text style={styles.yearTotal}>-{fmtShort(yearTotal)}</Text>
                  )}
                </View>

                <View style={styles.monthsCard}>
                  {yearMonths
                    .slice()
                    .sort((a, b) => b.month.localeCompare(a.month))
                    .map((m, idx, arr) => {
                      const isCurrent = m.month === currentMonthKey;
                      const pct = yearTotal > 0 ? Math.round((m.spent / yearTotal) * 100) : 0;
                      const catColor = m.topCategory
                        ? (CATEGORY_COLORS as any)[m.topCategory] ?? '#e5e7eb'
                        : '#e5e7eb';
                      const catDisplay = m.topCategory
                        ? (CAT_DISPLAY[m.topCategory] ?? m.topCategory)
                        : null;
                      const isLast = idx === arr.length - 1;

                      return (
                        <TouchableOpacity
                          key={m.month}
                          style={[styles.monthRow, !isLast && styles.monthRowBorder]}
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push({
                              pathname: '/transactions-month',
                              params: { month: m.month },
                            })
                          }
                        >
                          {/* Month name + amount */}
                          <View style={styles.monthTopRow}>
                            <View style={styles.monthTitleGroup}>
                              <Text style={styles.monthName}>{getMonthLabel(m.month)}</Text>
                              {isCurrent && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>Current</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.monthAmount}>
                              {m.spent > 0 ? `-₹${m.spent.toLocaleString('en-IN')}` : '—'}
                            </Text>
                          </View>

                          {/* Count + top category + net received */}
                          <View style={styles.monthSubRow}>
                            <Text style={styles.monthMeta} numberOfLines={1}>
                              {m.count > 0
                                ? `${m.count} transaction${m.count !== 1 ? 's' : ''}${catDisplay ? ` · top: ${catDisplay}` : ''}`
                                : 'No transactions'}
                            </Text>
                            {m.received > 0 && (
                              <Text style={styles.monthNet}>net +{fmtShort(m.received)}</Text>
                            )}
                          </View>

                          {/* Progress bar */}
                          {m.spent > 0 && (
                            <View style={styles.progressRow}>
                              <View style={styles.progressTrack}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    { width: `${pct}%`, backgroundColor: catColor },
                                  ]}
                                />
                              </View>
                              <Text style={styles.pctText}>{pct}%</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>
            );
          })}

        {error ? (
          <View style={styles.center}>
            <MaterialCommunityIcons name="wifi-off" size={32} color="#e5e7eb" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 10 },
  scroll: { paddingBottom: 32 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginTop: 3 },

  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  chartLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.8 },
  chartAvg: { fontSize: 11, color: '#9ca3af', fontWeight: '500', fontFamily: 'GeistMono_400Regular' },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 20,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  bar: { width: '65%', borderRadius: 5 },
  barLetter: { fontSize: 9, color: '#9ca3af', fontWeight: '500' },
  barLetterActive: { color: '#1a1a1a', fontWeight: '700' },

  yearSection: { marginTop: 20, paddingHorizontal: 16 },
  yearHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, paddingHorizontal: 4,
  },
  yearLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  yearTotal: { fontSize: 13, color: '#9ca3af', fontWeight: '600', fontFamily: 'GeistMono_600SemiBold' },

  monthsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  monthRow: { padding: 16, gap: 5 },
  monthRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },

  monthTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  currentBadge: {
    backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 11, color: '#16a34a', fontWeight: '700' },
  monthAmount: { fontSize: 15, fontWeight: '700', color: '#111827', fontFamily: 'GeistMono_700Bold' },

  monthSubRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  monthMeta: { fontSize: 12, color: '#9ca3af', flex: 1 },
  monthNet: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginLeft: 8, fontFamily: 'GeistMono_600SemiBold' },

  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressTrack: { flex: 1, height: 3, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  pctText: { fontSize: 11, color: '#9ca3af', fontWeight: '500', minWidth: 28, textAlign: 'right' },

  errorText: { color: '#9ca3af', fontSize: 13 },
});
