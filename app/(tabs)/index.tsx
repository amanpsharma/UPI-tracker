import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { groupTransactionsByDate } from "@/utils/groupByDate";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  AppState,
  AppStateStatus,
  Platform,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { format, subDays, eachDayOfInterval } from "date-fns";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/constants";
import { avatarStyle } from "@/constants/ui";
import { fmtShort } from "@/utils/format";
import { syncSmsToMongo, throttledSmsSync } from "@/services/smsSyncAndroid";
import { showToast } from "@/services/toast";
import { useStats, useTrend, useRecentTransactions, useInvalidateAll } from "@/hooks/useTransactions";
import Skeleton, { SkeletonTxRow } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import FadeInView from "@/components/FadeInView";
import AnimatedBar from "@/components/AnimatedBar";
import PressableScale from "@/components/PressableScale";

const BAR_AREA_HEIGHT = 80;

function getDayLabel(index: number, total: number): string {
  const daysFromEnd = total - 1 - index;
  if (daysFromEnd === 0) return "Today";
  if (daysFromEnd === 1) return "Y";
  return format(subDays(new Date(), daysFromEnd), "EEE");
}

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const appState = useRef<AppStateStatus>("active");
  const scrollRef = useRef<ScrollView>(null);
  const spinValue = useRef(new Animated.Value(0)).current;

  const { data: stats = null, isLoading: statsLoading, refetch: refetchStats } = useStats();
  const { data: recent = [], isLoading: recentLoading, refetch: refetchRecent } = useRecentTransactions(10);
  const { data: trend = [], isLoading: trendLoading, refetch: refetchTrend } = useTrend(7);
  const invalidateAll = useInvalidateAll();

  const loading = statsLoading && recentLoading && trendLoading;

  useEffect(() => {
    if (syncing) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.stopAnimation();
      spinValue.setValue(0);
    }
  }, [syncing]);

  const spinStyle = {
    transform: [
      {
        rotate: spinValue.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", "360deg"],
        }),
      },
    ],
  };

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        throttledSmsSync()
          .then(({ imported }) => {
            if (imported > 0) invalidateAll();
          })
          .catch(() => {});
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refetchStats();
      refetchRecent();
      refetchTrend();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS === "android") {
      try {
        await syncSmsToMongo();
      } catch (err: any) {
        // Log but don't block refresh
        console.warn("[SMS Sync]", err?.message);
      }
    }
    await Promise.all([refetchStats(), refetchRecent(), refetchTrend()]);
    setRefreshing(false);
  };

  const handleScanSms = async () => {
    if (Platform.OS !== "android") return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setRefreshing(true);
    setSyncing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { imported } = await syncSmsToMongo();
      if (imported > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(
          `Imported ${imported} new transaction${imported !== 1 ? "s" : ""}`,
          "success",
        );
      } else {
        showToast("All transactions are up to date", "info");
      }
      await Promise.all([refetchStats(), refetchRecent(), refetchTrend()]);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (err: any) {
      showToast(err?.message ?? "SMS sync failed", "error");
    } finally {
      setRefreshing(false);
      setSyncing(false);
    }
  };

  // --- Derived values ---
  const thisMonthTotal = stats?.thisMonth?.total ?? 0;
  const lastMonthTotal = stats?.lastMonth?.total ?? 0;
  const pctChange =
    lastMonthTotal > 0
      ? Math.round(((lastMonthTotal - thisMonthTotal) / lastMonthTotal) * 100)
      : null;
  const decreased = (pctChange ?? 0) >= 0;

  const monthName = format(new Date(), "MMMM");
  const dateRangeLabel = `${format(subDays(new Date(), 6), "d")}–${format(new Date(), "d MMM")}`;

  // Build chart bars
  const chartDays = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });
  const trendMap: Record<string, number> = {};
  trend.forEach((t) => {
    trendMap[t.date] = t.total;
  });
  const chartBars = chartDays.map((d, i) => ({
    value: trendMap[format(d, "yyyy-MM-dd")] ?? 0,
    label: getDayLabel(i, chartDays.length),
    isToday: i === chartDays.length - 1,
  }));
  const chartMax = Math.max(...chartBars.map((b) => b.value), 1);

  const recentGroups = useMemo(
    () => groupTransactionsByDate(recent),
    [recent],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header skeleton */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Skeleton width={120} height={13} radius={4} />
              <View style={{ height: 8 }} />
              <Skeleton width={200} height={40} radius={6} />
              <View style={{ height: 8 }} />
              <Skeleton width={140} height={12} radius={4} />
            </View>
          </View>

          {/* Chart card skeleton */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Skeleton width={80} height={11} radius={4} />
              <Skeleton width={100} height={20} radius={10} />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 16,
                height: 80,
                alignItems: "flex-end",
              }}
            >
              {[0.3, 0.6, 0.4, 0.8, 0.5, 0.7, 0.9].map((h, i) => (
                <Skeleton
                  key={i}
                  width={26}
                  height={h * 80}
                  radius={6}
                  style={{ flex: 1 }}
                />
              ))}
            </View>
          </View>

          {/* Recent rows skeleton */}
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Skeleton width={60} height={11} radius={4} />
              <Skeleton width={50} height={12} radius={4} />
            </View>
            <View style={styles.dayCard}>
              <SkeletonTxRow />
              <SkeletonTxRow />
              <SkeletonTxRow />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1a1a1a"
          />
        }
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <FadeInView delay={0} duration={600}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.spentLabel}>Spent in {monthName}</Text>
            <Text style={styles.amountText}>
              -₹{thisMonthTotal.toLocaleString("en-IN")}
            </Text>
            {pctChange !== null && (
              <View style={styles.compareRow}>
                <MaterialCommunityIcons
                  name={decreased ? "arrow-down" : "arrow-up"}
                  size={13}
                  color={decreased ? "#16a34a" : "#dc2626"}
                />
                <Text
                  style={[
                    styles.compareText,
                    { color: decreased ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {Math.abs(pctChange)}% vs last month
                </Text>
              </View>
            )}
          </View>
          {Platform.OS === "android" && (
            <TouchableOpacity
              style={styles.scanBtn}
              onPress={handleScanSms}
              disabled={syncing}
              activeOpacity={0.7}
            >
              <Animated.View style={syncing ? spinStyle : undefined}>
                <MaterialCommunityIcons
                  name="refresh"
                  size={13}
                  color="#555"
                />
              </Animated.View>
              <Text style={styles.scanBtnText}>Scan SMS</Text>
            </TouchableOpacity>
          )}
        </View>
        </FadeInView>

        {/* ── 7-Day Bar Chart ── */}
        <FadeInView delay={150} duration={500}>
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartLabel}>LAST 7 DAYS</Text>
            <View style={styles.datePill}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={11}
                color="#9ca3af"
              />
              <Text style={styles.datePillText}>{dateRangeLabel}</Text>
            </View>
          </View>
          <View style={styles.barsRow}>
            {chartBars.map((bar, i) => {
              const barH =
                bar.value > 0
                  ? Math.max(10, (bar.value / chartMax) * BAR_AREA_HEIGHT)
                  : 8;
              return (
                <AnimatedBar
                  key={i}
                  height={barH}
                  maxHeight={BAR_AREA_HEIGHT}
                  color={bar.isToday ? "#1a1a1a" : "#e5e7eb"}
                  label={bar.label}
                  valueLabel={bar.value > 0 ? fmtShort(bar.value) : ""}
                  index={i}
                  isToday={bar.isToday}
                />
              );
            })}
          </View>
        </View>
        </FadeInView>

        {/* ── Category Cards ── */}
        {stats && stats.byCategory.length > 0 && (
          <FadeInView delay={300} from="right" duration={500}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {stats.byCategory.map((cat, idx) => (
              <FadeInView key={cat._id} delay={350 + idx * 60} from="right" distance={30}>
              <View style={styles.catCard}>
                <View style={styles.catCardTop}>
                  <MaterialCommunityIcons
                    name={CATEGORY_ICONS[cat._id] as any}
                    size={13}
                    color={CATEGORY_COLORS[cat._id]}
                  />
                  <Text style={styles.catCardName}>{cat._id}</Text>
                </View>
                <Text style={styles.catCardAmount}>-{fmtShort(cat.total)}</Text>
              </View>
              </FadeInView>
            ))}
          </ScrollView>
          </FadeInView>
        )}

        {/* ── Recent Transactions ── */}
        <FadeInView delay={400} duration={500}>
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentLabel}>RECENT</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/activity")}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <EmptyState
              icon="receipt-text-outline"
              title="No transactions yet"
              body={
                Platform.OS === "android"
                  ? "Tap below to scan your bank SMS, or add a transaction manually."
                  : "Add your first transaction manually to get started."
              }
              cta={{
                label: "Add transaction",
                onPress: () => router.push("/(tabs)/add"),
              }}
            />
          ) : (
            recentGroups.map((group) => (
              <View key={group.date} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayLabel}>{group.label}</Text>
                  {group.sentTotal > 0 && (
                    <Text style={styles.dayTotal}>
                      -{fmtShort(group.sentTotal)}
                    </Text>
                  )}
                </View>
                <View style={styles.dayCard}>
                  {group.transactions.map((tx, i) => {
                    const av = avatarStyle(tx.recipient || "U");
                    const isSent = (tx.type ?? "sent") === "sent";
                    const isFirst = i === 0;
                    const isLast = i === group.transactions.length - 1;
                    return (
                      <PressableScale
                        key={tx._id}
                        style={[
                          styles.txRow,
                          isFirst && styles.txRowFirst,
                          isLast && styles.txRowLast,
                          !isLast && styles.txRowSep,
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: "/transaction-detail",
                            params: { id: tx._id },
                          })
                        }
                      >
                        <View
                          style={[styles.avatar, { backgroundColor: av.bg }]}
                        >
                          <Text style={[styles.avatarText, { color: av.text }]}>
                            {(tx.recipient || "U")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={styles.txName} numberOfLines={1}>
                            {tx.recipient}
                          </Text>
                          <View style={styles.txMeta}>
                            <View
                              style={[
                                styles.catDot,
                                {
                                  backgroundColor: CATEGORY_COLORS[tx.category],
                                },
                              ]}
                            />
                            <Text style={styles.txMetaText}>
                              {tx.category} ·{" "}
                              {format(new Date(tx.paidAt), "HH:mm")}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.txAmount,
                            { color: isSent ? "#111827" : "#16a34a" },
                          ]}
                        >
                          {isSent ? "-" : "+"}₹
                          {tx.amount.toLocaleString("en-IN")}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingBottom: 40 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#fafafa",
  },
  headerLeft: { flex: 1, gap: 2 },
  spentLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  amountText: {
    fontSize: 40,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
    lineHeight: 46,
    fontFamily: "GeistMono_700Bold",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  compareText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    marginTop: 4,
  },
  scanBtnText: {
    fontSize: 12,
    color: "#555",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },

  // Chart
  chartCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
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
    color: "#9ca3af",
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  datePillText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_AREA_HEIGHT + 40,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  bar: {
    width: "60%",
    borderRadius: 6,
  },
  barValueLabel: {
    fontSize: 9,
    color: "#9ca3af",
    fontFamily: "Inter_400Regular",
    marginBottom: 3,
    textAlign: "center",
  },
  barDayLabel: {
    fontSize: 10,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  barDayLabelToday: {
    color: "#1a1a1a",
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },

  // Category
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  catCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    minWidth: 120,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  catCardTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  catCardName: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  catCardAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "GeistMono_700Bold",
  },

  // Recent
  recentSection: { marginHorizontal: 16, marginTop: 4 },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  // Day-grouped sections (matches Activity screen)
  daySection: { marginBottom: 20 },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.5,
    fontFamily: "Inter_700Bold",
  },
  dayTotal: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "GeistMono_400Regular",
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#fff",
  },
  txRowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  txRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  txRowSep: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  txInfo: { flex: 1 },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 3,
    fontFamily: "Inter_600SemiBold",
  },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  txMetaText: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "Inter_400Regular",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "GeistMono_700Bold",
  },

  emptyBox: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  emptyHint: { fontSize: 12, color: "#d1d5db", fontFamily: "Inter_400Regular" },
});
