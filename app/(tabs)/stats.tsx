import { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { CAT_DISPLAY } from '@/constants/ui';
import { fmtShort, fmtFull } from '@/utils/format';
import { useStats, useTopRecipients } from '@/hooks/useTransactions';
import { colors, fonts, radius } from '@/constants/theme';

const TODAY = new Date();

export default function InsightsScreen() {
  const [selectedDate, setSelectedDate] = useState(TODAY);

  const isCurrentMonth = isSameMonth(selectedDate, TODAY);
  const monthParam = format(selectedDate, 'yyyy-MM');

  const { data: stats = null, isLoading: loading, error: queryError, refetch } = useStats(monthParam);
  const { data: topRecipients = [], refetch: refetchRecipients } = useTopRecipients(monthParam);
  const [refreshing, setRefreshing] = useState(false);
  const error = queryError?.message ?? '';

  useFocusEffect(useCallback(() => { refetch(); refetchRecipients(); }, [monthParam]));

  const onRefresh = async () => { setRefreshing(true); await Promise.all([refetch(), refetchRecipients()]); setRefreshing(false); };

  const prevMonth = () => { setSelectedDate((d) => subMonths(d, 1)); };
  const nextMonth = () => { if (!isCurrentMonth) { setSelectedDate((d) => addMonths(d, 1)); } };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textMuted} />
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
    color: CATEGORY_COLORS[c._id] ?? '#6B6B80',
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <TouchableOpacity style={styles.gearBtn} onPress={() => router.push('/(tabs)/settings')} activeOpacity={0.7}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.7}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{format(selectedDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
            onPress={nextMonth}
            activeOpacity={isCurrentMonth ? 1 : 0.7}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={isCurrentMonth ? colors.textDisabled : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary cards row */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.sentCard]}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.dangerSoft }]}>
                <MaterialCommunityIcons name="arrow-up" size={14} color={colors.danger} />
              </View>
              <Text style={styles.summaryLabel}>SENT</Text>
            </View>
            <Text style={styles.sentAmount}>{fmtShort(sent)}</Text>
            <Text style={styles.summaryCount}>{sentCount} txns</Text>
          </View>

          <View style={[styles.summaryCard, styles.receivedCard]}>
            <View style={styles.summaryIconRow}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.successSoft }]}>
                <MaterialCommunityIcons name="arrow-down" size={14} color={colors.success} />
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
            <Text style={[styles.netAmount, { color: net >= 0 ? colors.success : colors.danger }]}>
              {net >= 0 ? '+' : '-'}{fmtFull(Math.abs(net))}
            </Text>
          </View>
          <View style={[styles.netIconBg, { backgroundColor: net >= 0 ? colors.successSoft : colors.dangerSoft }]}>
            <MaterialCommunityIcons
              name={net >= 0 ? 'trending-up' : 'trending-down'}
              size={28}
              color={net >= 0 ? colors.success : colors.danger}
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
                        <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[c._id] ?? '#6B6B80' }]} />
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
          <TouchableOpacity onPress={() => router.push('/category-rules')}>
            <Text style={styles.rulesLink}>Rules</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.catCard}>
          {catData.length === 0 ? (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-donut-variant" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No spending this month</Text>
            </View>
          ) : (
            catData.map((c, idx) => {
              const pct = sent > 0 ? (c.total / sent) * 100 : 0;
              const color = CATEGORY_COLORS[c._id] ?? '#6B6B80';
              return (
                <View key={c._id} style={[styles.catRow, idx < catData.length - 1 && styles.catRowBorder]}>
                  <View style={[styles.catIcon, { backgroundColor: `${color}20` }]}>
                    <MaterialCommunityIcons name={CATEGORY_ICONS[c._id] as any} size={16} color={color} />
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

        {/* Top Recipients */}
        {topRecipients.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionLabel}>TOP RECIPIENTS</Text>
              <Text style={styles.recipientSubtitle}>{topRecipients.length} people</Text>
            </View>

            <View style={styles.recipientCard}>
              {topRecipients.map((r, idx) => {
                const maxAmount = topRecipients[0].total;
                const pct = maxAmount > 0 ? (r.total / maxAmount) * 100 : 0;
                return (
                  <TouchableOpacity
                    key={r.recipient}
                    style={[styles.recipientRow, idx < topRecipients.length - 1 && styles.recipientRowBorder]}
                    activeOpacity={0.7}
                    onPress={() => router.push({ pathname: '/recipient-transactions', params: { recipient: r.recipient, month: monthParam } })}
                  >
                    <View style={styles.recipientRank}>
                      <Text style={styles.rankText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.recipientInfo}>
                      <View style={styles.recipientTopRow}>
                        <Text style={styles.recipientName} numberOfLines={1}>{r.recipient}</Text>
                        <Text style={styles.recipientAmount}>-{fmtShort(r.total)}</Text>
                      </View>
                      <View style={styles.recipientMeta}>
                        <Text style={styles.recipientCount}>{r.count} txn{r.count !== 1 ? 's' : ''}</Text>
                      </View>
                      <View style={styles.recipientBarTrack}>
                        <View style={[styles.recipientBarFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.5, fontFamily: fonts.extrabold },
  gearBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },

  // Month navigator
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, marginBottom: 20,
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center',
  },
  navBtnDisabled: { backgroundColor: colors.surface },
  monthLabel: { fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 130, textAlign: 'center', fontFamily: fonts.bold },

  // Summary cards
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  sentCard: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  receivedCard: { borderLeftWidth: 3, borderLeftColor: colors.success },
  summaryIconRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  summaryIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, fontFamily: fonts.bold },
  sentAmount: { fontSize: 22, fontWeight: '800', color: colors.danger, letterSpacing: -0.5, marginBottom: 4, fontFamily: fonts.monoBold },
  receivedAmount: { fontSize: 22, fontWeight: '800', color: colors.success, letterSpacing: -0.5, marginBottom: 4, fontFamily: fonts.monoBold },
  summaryCount: { fontSize: 11, color: colors.textMuted, fontWeight: '500', fontFamily: fonts.medium },

  // Net card
  netCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  netLeft: { gap: 4 },
  netLabel: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, fontFamily: fonts.bold },
  netAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, fontFamily: fonts.monoBold },
  netIconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, fontFamily: fonts.bold },
  rulesLink: { fontSize: 13, fontWeight: '700', color: colors.primaryLight, fontFamily: fonts.bold },

  // Donut card
  donutCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20,
    borderWidth: 1, borderColor: colors.border, marginBottom: 24,
  },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  centerLabel: { alignItems: 'center' },
  centerLabelTop: { fontSize: 9, color: colors.textMuted, fontWeight: '500', textAlign: 'center', fontFamily: fonts.medium },
  centerLabelAmt: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center', fontFamily: fonts.monoBold },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 4, flexShrink: 0 },
  legendName: { flex: 1, fontSize: 12, color: colors.textSecondary, fontWeight: '500', fontFamily: fonts.medium },
  legendPct: { fontSize: 12, color: colors.textMuted, fontWeight: '600', fontFamily: fonts.semibold },

  emptyChart: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },

  // Category list
  catCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  catIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  catInfo: { flex: 1, gap: 8 },
  catTopRow: { flexDirection: 'row', alignItems: 'center' },
  catName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fonts.semibold },
  catRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catAmount: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fonts.monoBold },
  catPct: { fontSize: 12, color: colors.textMuted, fontWeight: '500', minWidth: 32, textAlign: 'right', fontFamily: fonts.medium },
  barTrack: { height: 4, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },

  // Top Recipients
  recipientSubtitle: { fontSize: 11, color: colors.textMuted, fontWeight: '500', fontFamily: fonts.medium },
  recipientCard: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  recipientRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  recipientRank: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.primary, fontFamily: fonts.bold },
  recipientInfo: { flex: 1, gap: 5 },
  recipientTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recipientName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fonts.semibold, marginRight: 8 },
  recipientAmount: { fontSize: 14, fontWeight: '700', color: colors.text, fontFamily: fonts.monoBold },
  recipientMeta: { flexDirection: 'row', alignItems: 'center' },
  recipientCount: { fontSize: 11, color: colors.textMuted, fontWeight: '500', fontFamily: fonts.medium },
  recipientBarTrack: { height: 3, backgroundColor: colors.surfaceElevated, borderRadius: 2, overflow: 'hidden' },
  recipientBarFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
});
