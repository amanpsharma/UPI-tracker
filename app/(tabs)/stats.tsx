import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Portal, Dialog, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORIES } from '@/constants';
import { Stats, Category } from '@/types';
import { getBudgets, saveBudgets, Budgets } from '@/services/budgetStorage';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TrendPoint = {
  value: number;
  label?: string;
  frontColor: string;
  minHeight?: number;
  topLabelComponent?: () => React.ReactNode;
  onPress?: () => void;
};
type TrendDays = 7 | 30;

function fmtAmount(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [budgets, setBudgets] = useState<Budgets | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState<TrendDays>(30);
  const [selectedBar, setSelectedBar] = useState<{ date: string; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [budgetInput, setBudgetInput] = useState('');
  const [error, setError] = useState('');

  const buildTrend = (
    raw: { date: string; total: number }[],
    days: TrendDays,
    onSelect: (date: string, total: number) => void,
  ): TrendPoint[] => {
    const map: Record<string, number> = {};
    raw.forEach((r) => { map[r.date] = r.total; });
    const interval = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() });
    return interval.map((d, i) => {
      const key = format(d, 'yyyy-MM-dd');
      const val = map[key] ?? 0;
      const showLabel = days === 7 || i === 0 || i === interval.length - 1 || (i + 1) % 7 === 0;
      return {
        value: val,
        label: showLabel ? format(d, days === 7 ? 'EEE' : 'd') : '',
        frontColor: val > 0 ? '#6200ee' : '#e8e0ff',
        minHeight: val > 0 ? 4 : 0,
        topLabelComponent: days === 7 && val > 0
          ? () => <Text style={styles.barLabel}>{fmtAmount(val)}</Text>
          : undefined,
        onPress: val > 0 ? () => onSelect(format(d, 'dd MMM'), val) : undefined,
      };
    });
  };

  const load = useCallback(async () => {
    try {
      setError('');
      const [s, b, t] = await Promise.all([api.getStats(), getBudgets(), api.getTrend(trendDays)]);
      setStats(s);
      setBudgets(b);
      setSelectedBar(null);
      setTrend(buildTrend(t, trendDays, (date, total) => setSelectedBar({ date, total })));
    } catch (err: any) {
      setError(err.message ?? 'Failed to load stats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trendDays]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const openBudgetDialog = (category: Category, current: number) => {
    setEditingCategory(category);
    setBudgetInput(current > 0 ? String(current) : '');
  };

  const saveBudget = async () => {
    if (!editingCategory || !budgets) return;
    const val = parseFloat(budgetInput) || 0;
    const updated = { ...budgets, [editingCategory]: val };
    await saveBudgets(updated);
    setBudgets(updated);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
      </SafeAreaView>
    );
  }

  if (error || !budgets) {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons name="wifi-off" size={40} color="#ddd" />
        <Text style={styles.errorText}>{error || 'Could not load stats.'}</Text>
      </SafeAreaView>
    );
  }

  const spendMap: Partial<Record<Category, number>> = {};
  stats?.byCategory.forEach((c) => { spendMap[c._id] = c.total; });

  const monthLabel = format(new Date(), 'MMMM yyyy');

  // Total budget vs spent (only for categories that have a budget set)
  const totalBudget = CATEGORIES.reduce((s, c) => s + (budgets[c] ?? 0), 0);
  const totalSpent = stats?.thisMonth.total ?? 0;
  const budgetRemaining = totalBudget - totalSpent;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}
      >
        <Text variant="headlineSmall" style={styles.heading}>Spending Stats</Text>

        {/* Summary cards */}
        <View style={styles.row}>
          <Surface style={[styles.statCard, { backgroundColor: '#6200ee' }]} elevation={2}>
            <MaterialCommunityIcons name="calendar-month" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardLabel}>{monthLabel}</Text>
            <Text style={styles.cardAmount}>₹{(stats?.thisMonth.total ?? 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.cardCount}>{stats?.thisMonth.count ?? 0} payments</Text>
          </Surface>

          <Surface style={[styles.statCard, { backgroundColor: '#455a64' }]} elevation={2}>
            <MaterialCommunityIcons name="history" size={18} color="rgba(255,255,255,0.7)" />
            <Text style={styles.cardLabel}>All time</Text>
            <Text style={styles.cardAmount}>₹{(stats?.allTime.total ?? 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.cardCount}>{stats?.allTime.count ?? 0} payments</Text>
          </Surface>
        </View>

        {/* Spending Trend Chart */}
        <Surface style={styles.chartCard} elevation={1}>
          <View style={styles.chartHeader}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Spending Trend</Text>
            <View style={styles.trendToggle}>
              {([7, 30] as TrendDays[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.trendChip, trendDays === d && styles.trendChipActive]}
                  onPress={() => setTrendDays(d)}
                >
                  <Text style={[styles.trendChipText, trendDays === d && styles.trendChipTextActive]}>
                    {d}D
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {trendDays === 30 && selectedBar && (
            <View style={styles.barTooltip}>
              <MaterialCommunityIcons name="calendar-today" size={13} color="#6200ee" />
              <Text style={styles.barTooltipText}>
                {selectedBar.date} — <Text style={{ fontWeight: '700' }}>{fmtAmount(selectedBar.total)}</Text>
              </Text>
            </View>
          )}
          {trend.length > 0 ? (
            <BarChart
              data={trend}
              width={SCREEN_WIDTH - 48}
              height={180}
              maxValue={Math.max(...trend.map((t) => t.value), 1) * (trendDays === 7 ? 1.4 : 1.1)}
              barWidth={trendDays === 7 ? 32 : 6}
              spacing={trendDays === 7 ? 10 : 3}
              initialSpacing={trendDays === 7 ? 6 : 4}
              noOfSections={3}
              hideRules
              hideYAxisText
              yAxisLabelWidth={0}
              xAxisThickness={0}
              yAxisThickness={0}
              barBorderRadius={4}
              labelWidth={trendDays === 7 ? 42 : 12}
              xAxisLabelTextStyle={{ fontSize: 9, color: '#aaa' }}
              topLabelContainerStyle={styles.barLabelContainer}
              isAnimated
            />
          ) : (
            <View style={styles.chartEmpty}>
              <Text style={{ color: '#ccc', fontSize: 13 }}>No spending data yet</Text>
            </View>
          )}
        </Surface>

        {/* Overall budget summary */}
        {totalBudget > 0 && (
          <Surface style={styles.budgetSummary} elevation={1}>
            <View style={styles.budgetSummaryRow}>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: '#333' }}>Monthly budget</Text>
              <Text
                variant="bodyMedium"
                style={{ fontWeight: '700', color: budgetRemaining < 0 ? '#b00020' : '#2e7d32' }}
              >
                {budgetRemaining < 0
                  ? `₹${Math.abs(budgetRemaining).toLocaleString('en-IN')} over`
                  : `₹${budgetRemaining.toLocaleString('en-IN')} left`}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%`,
                    backgroundColor: budgetRemaining < 0 ? '#b00020' : '#6200ee',
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetMeta}>
              ₹{totalSpent.toLocaleString('en-IN')} of ₹{totalBudget.toLocaleString('en-IN')}
            </Text>
          </Surface>
        )}

        {/* Per-category budget */}
        <View style={styles.sectionHeader}>
          <Text variant="titleSmall" style={styles.sectionTitle}>Budget vs Spending</Text>
          <Text variant="bodySmall" style={styles.hint}>Tap amount to set budget</Text>
        </View>

        {CATEGORIES.map((cat) => {
          const spent = spendMap[cat] ?? 0;
          const budget = budgets[cat] ?? 0;
          const hasBudget = budget > 0;
          const pct = hasBudget ? Math.min((spent / budget) * 100, 100) : (spent > 0 ? 100 : 0);
          const over = hasBudget && spent > budget;
          const barColor = over ? '#b00020' : hasBudget ? CATEGORY_COLORS[cat] : '#ddd';

          return (
            <View key={cat} style={styles.catBlock}>
              <View style={styles.catHeader}>
                <View style={styles.catLabel}>
                  <View style={[styles.catIcon, { backgroundColor: CATEGORY_COLORS[cat] }]}>
                    <MaterialCommunityIcons name={CATEGORY_ICONS[cat] as any} size={13} color="#fff" />
                  </View>
                  <Text variant="bodyMedium" style={styles.catName}>{cat}</Text>
                  {over && <MaterialCommunityIcons name="alert-circle" size={13} color="#b00020" />}
                </View>
                <View style={styles.catAmounts}>
                  <Text variant="bodySmall" style={{ color: over ? '#b00020' : '#333', fontWeight: '600' }}>
                    ₹{spent.toLocaleString('en-IN')}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={styles.budgetTap}
                    onPress={() => openBudgetDialog(cat, budget)}
                  >
                    {hasBudget ? ` / ₹${budget.toLocaleString('en-IN')}` : '  + Budget'}
                  </Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          );
        })}

      </ScrollView>

      <Portal>
        <Dialog visible={!!editingCategory} onDismiss={() => setEditingCategory(null)}>
          <Dialog.Title>Budget for {editingCategory}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Monthly limit (₹)"
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              mode="outlined"
              left={<TextInput.Affix text="₹" />}
              autoFocus
              placeholder="0"
            />
            {budgetInput && parseFloat(budgetInput) > 0 && (
              <Text variant="bodySmall" style={styles.dialogHint}>
                You'll get a warning when you exceed ₹{parseFloat(budgetInput).toLocaleString('en-IN')}/month.
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditingCategory(null)}>Cancel</Button>
            <Button mode="contained" onPress={saveBudget}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  scroll: { padding: 16, gap: 14 },
  heading: { fontWeight: 'bold', color: '#6200ee' },
  errorText: { color: '#b00020', textAlign: 'center', padding: 16 },

  row: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, alignItems: 'center', gap: 2 },
  cardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '500', marginTop: 4 },
  cardAmount: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  cardCount: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },

  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trendToggle: { flexDirection: 'row', gap: 6 },
  trendChip: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  trendChipActive: { backgroundColor: '#6200ee', borderColor: '#6200ee' },
  trendChipText: { fontSize: 12, fontWeight: '600', color: '#888' },
  trendChipTextActive: { color: '#fff' },
  chartEmpty: { height: 140, justifyContent: 'center', alignItems: 'center' },
  barLabelContainer: { justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  barLabel: { fontSize: 9, color: '#6200ee', fontWeight: '700', textAlign: 'center' },
  barTooltip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f3eeff', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  barTooltipText: { fontSize: 12, color: '#6200ee' },

  budgetSummary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  budgetSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetMeta: { color: '#aaa', fontSize: 12, textAlign: 'right' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '600', color: '#333' },
  hint: { color: '#aaa' },

  catBlock: { gap: 6, backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  catName: { color: '#333' },
  catAmounts: { flexDirection: 'row', alignItems: 'center' },
  budgetTap: { color: '#6200ee', fontSize: 12 },
  barTrack: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  dialogHint: { color: '#888', marginTop: 8 },
});
