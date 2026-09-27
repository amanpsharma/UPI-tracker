import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { format } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { CATEGORY_COLORS } from "@/constants";
import { CAT_DISPLAY } from "@/constants/ui";
import { fmtShort } from "@/utils/format";
import { MonthlyData } from "@/types";
import { colors, fonts, radius } from "@/constants/theme";

import AnimatedBar from "@/components/AnimatedBar";

const CHART_HEIGHT = 120;

function getBarLetter(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM")[0];
}

function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}

export default function HistoryScreen() {
  const [months, setMonths] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await api.getMonthly();
      setMonths(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const currentMonthKey = format(new Date(), "yyyy-MM");
  const totalSpent = months.reduce((s, m) => s + m.spent, 0);
  const activeMonths = months.filter((m) => m.spent > 0);
  const avgMonthly =
    activeMonths.length > 0 ? totalSpent / activeMonths.length : 0;
  const chartMax = Math.max(...months.map((m) => m.spent), 1);

  const byYear: Record<string, MonthlyData[]> = {};
  months.forEach((m) => {
    const yr = m.month.slice(0, 4);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(m);
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            {activeMonths.length} month{activeMonths.length !== 1 ? "s" : ""} ·
            avg -{fmtShort(avgMonthly)}/mo
          </Text>
        </View>

        {/* ── 12-Month Bar Chart ── */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>LAST 12 MONTHS</Text>
            <Text style={styles.chartAvg}>avg -{fmtShort(avgMonthly)}</Text>
          </View>
          <View style={styles.barsRow}>
            {months.map((m, idx) => {
              const isCurrent = m.month === currentMonthKey;
              const barH =
                m.spent > 0
                  ? Math.max(10, (m.spent / chartMax) * CHART_HEIGHT)
                  : 6;
              return (
                <AnimatedBar
                  key={m.month}
                  height={barH}
                  maxHeight={CHART_HEIGHT}
                  color={isCurrent ? colors.primary : colors.surfaceElevated}
                  label={getBarLetter(m.month)}
                  valueLabel={m.spent > 0 ? fmtShort(m.spent) : ""}
                  index={idx}
                  isToday={isCurrent}
                />
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
                      const pct =
                        yearTotal > 0
                          ? Math.round((m.spent / yearTotal) * 100)
                          : 0;
                      const catColor = m.topCategory
                        ? ((CATEGORY_COLORS as any)[m.topCategory] ?? colors.textMuted)
                        : colors.textMuted;
                      const catDisplay = m.topCategory
                        ? (CAT_DISPLAY[m.topCategory] ?? m.topCategory)
                        : null;
                      const isLast = idx === arr.length - 1;

                      return (
                        <TouchableOpacity
                          key={m.month}
                          style={[
                            styles.monthRow,
                            !isLast && styles.monthRowBorder,
                          ]}
                          activeOpacity={0.7}
                          onPress={() =>
                            router.push({
                              pathname: "/transactions-month",
                              params: { month: m.month },
                            })
                          }
                        >
                          <View style={styles.monthTopRow}>
                            <View style={styles.monthTitleGroup}>
                              <Text style={styles.monthName}>
                                {getMonthLabel(m.month)}
                              </Text>
                              {isCurrent && (
                                <View style={styles.currentBadge}>
                                  <Text style={styles.currentBadgeText}>
                                    Current
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.monthAmount}>
                              {m.spent > 0
                                ? `-₹${m.spent.toLocaleString("en-IN")}`
                                : "—"}
                            </Text>
                          </View>

                          <View style={styles.monthSubRow}>
                            <Text style={styles.monthMeta} numberOfLines={1}>
                              {m.count > 0
                                ? `${m.count} transaction${m.count !== 1 ? "s" : ""}${catDisplay ? ` · top: ${catDisplay}` : ""}`
                                : "No transactions"}
                            </Text>
                            {m.received > 0 && (
                              <Text style={styles.monthNet}>
                                net +{fmtShort(m.received)}
                              </Text>
                            )}
                          </View>

                          {m.spent > 0 && (
                            <View style={styles.progressRow}>
                              <View style={styles.progressTrack}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    {
                                      width: `${pct}%`,
                                      backgroundColor: catColor,
                                    },
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  scroll: { paddingBottom: 12 },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    fontFamily: fonts.extrabold,
  },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: "500", marginTop: 3, fontFamily: fonts.medium },

  chartCard: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    fontFamily: fonts.bold,
  },
  chartAvg: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    fontFamily: fonts.monoRegular,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + 36,
  },

  yearSection: { marginTop: 20, paddingHorizontal: 16 },
  yearHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  yearLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600", fontFamily: fonts.semibold },
  yearTotal: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "600",
    fontFamily: fonts.monoSemibold,
  },

  monthsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  monthRow: { padding: 16, gap: 5 },
  monthRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },

  monthTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthName: { fontSize: 15, fontWeight: "700", color: colors.text, fontFamily: fonts.bold },
  currentBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 11, color: colors.primaryLight, fontWeight: "700", fontFamily: fonts.bold },
  monthAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.monoBold,
  },

  monthSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  monthMeta: { fontSize: 12, color: colors.textMuted, flex: 1, fontFamily: fonts.regular },
  monthNet: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "600",
    marginLeft: 8,
    fontFamily: fonts.monoSemibold,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  pctText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "500",
    minWidth: 28,
    textAlign: "right",
    fontFamily: fonts.medium,
  },

  errorText: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600", fontFamily: fonts.semibold },
});
