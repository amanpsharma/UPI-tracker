import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator as RNActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { subDays, startOfMonth, format } from "date-fns";
import { Text, Searchbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { api } from "@/services/api";
import { CATEGORIES, CATEGORY_COLORS } from "@/constants";
import { avatarStyle } from "@/constants/ui";
import { fmtShort } from "@/utils/format";
import { showToast } from "@/services/toast";
import { Category, Transaction, TransactionType } from "@/types";
import { groupTransactionsByDate, DayGroup } from "@/utils/groupByDate";
import Skeleton, { SkeletonTxRow } from "@/components/Skeleton";
import EmptyState from "@/components/EmptyState";
import { colors, fonts, radius } from "@/constants/theme";

const PAGE_SIZE = 50;

export default function ActivityScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "">("");
  const [filterType, setFilterType] = useState<TransactionType | "">("");
  const [dateRange, setDateRange] = useState<"7d" | "month" | "90d" | "">("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const skipRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const getFromDate = (range: typeof dateRange): string | undefined => {
    if (range === "7d") return subDays(new Date(), 7).toISOString();
    if (range === "month") return startOfMonth(new Date()).toISOString();
    if (range === "90d") return subDays(new Date(), 90).toISOString();
    return undefined;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    skipRef.current = 0;
    loadingMoreRef.current = false;
    try {
      const [data, count] = await Promise.all([
        api.getTransactions({
          category: filterCategory || undefined,
          type: filterType || undefined,
          from: getFromDate(dateRange),
          search: debouncedSearch.trim() || undefined,
          skip: 0,
          limit: PAGE_SIZE,
        }),
        api.getTransactionCount(),
      ]);
      setTransactions(data);
      setTotalCount(count);
      skipRef.current = data.length;
      setHasMore(data.length === PAGE_SIZE);
    } catch (err: any) {
      setError(err.message ?? "Failed to load transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterType, dateRange, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await api.getTransactions({
        category: filterCategory || undefined,
        type: filterType || undefined,
        from: getFromDate(dateRange),
        search: debouncedSearch.trim() || undefined,
        skip: skipRef.current,
        limit: PAGE_SIZE,
      });
      setTransactions((prev) => [...prev, ...data]);
      skipRef.current += data.length;
      setHasMore(data.length === PAGE_SIZE);
    } catch (err: any) {
      showToast(err?.message ?? "Failed to load more transactions.", "error");
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDelete = useCallback(async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
    skipRef.current = Math.max(0, skipRef.current - 1);
  }, []);

  const groups = useMemo<DayGroup[]>(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  const confirmDelete = useCallback((id: string, name: string) => {
    Alert.alert("Delete", `Remove transaction to ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => handleDelete(id) },
    ]);
  }, []);

  const renderGroup = useCallback(({ item: group }: { item: DayGroup }) => (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{group.label}</Text>
        {group.sentTotal > 0 && (
          <Text style={styles.dayTotal}>-{fmtShort(group.sentTotal)}</Text>
        )}
      </View>
      <View style={styles.dayCard}>
        {group.transactions.map((tx, i) => {
          const av = avatarStyle(tx.recipient || "U");
          const isSent = (tx.type ?? "sent") === "sent";
          const isFirst = i === 0;
          const isLast = i === group.transactions.length - 1;
          return (
            <TouchableOpacity
              key={tx._id}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: "/transaction-detail",
                  params: { id: tx._id },
                })
              }
              onLongPress={() => confirmDelete(tx._id, tx.recipient || "Unknown")}
              delayLongPress={500}
              style={[
                styles.txRow,
                isFirst && styles.txRowFirst,
                isLast && styles.txRowLast,
                !isLast && styles.txRowSep,
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                <Text style={[styles.avatarText, { color: av.text }]}>
                  {(tx.recipient || "U")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txName} numberOfLines={1}>
                  {tx.recipient || "Unknown"}
                </Text>
                <View style={styles.txMeta}>
                  <View
                    style={[
                      styles.catDot,
                      { backgroundColor: CATEGORY_COLORS[tx.category] },
                    ]}
                  />
                  <Text style={styles.txMetaText}>
                    {tx.category} · {format(new Date(tx.paidAt), "HH:mm")}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: isSent ? colors.text : colors.success },
                ]}
              >
                {isSent ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ), []);

  const searchSpentTotal = useMemo(() => {
    if (!debouncedSearch.trim()) return 0;
    return transactions.reduce(
      (sum, tx) => sum + ((tx.type ?? "sent") === "sent" ? tx.amount : 0),
      0,
    );
  }, [transactions, debouncedSearch]);

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <RNActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.footerText}>Loading more...</Text>
        </View>
      );
    }

    const hasSearch = debouncedSearch.trim().length > 0;

    if (hasSearch && !hasMore && transactions.length > 0) {
      return (
        <View style={styles.searchSummary}>
          <View style={styles.searchSummaryRow}>
            <Text style={styles.searchSummaryLabel}>Matches</Text>
            <Text style={styles.searchSummaryValue}>{transactions.length}</Text>
          </View>
          <View style={styles.searchSummaryDivider} />
          <View style={styles.searchSummaryRow}>
            <Text style={styles.searchSummaryLabel}>Total spent</Text>
            <Text style={styles.searchSummarySpent}>
              -₹{searchSpentTotal.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      );
    }

    if (!hasMore && transactions.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            All {transactions.length} transactions loaded
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        {totalCount !== null && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {totalCount.toLocaleString("en-IN")}
            </Text>
          </View>
        )}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search merchant..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          inputStyle={{
            fontSize: 14,
            color: colors.text,
            fontFamily: fonts.regular,
          }}
          placeholderTextColor={colors.textMuted}
          iconColor={colors.textMuted}
          elevation={0}
        />
      </View>

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollOuter}
        contentContainerStyle={styles.chipScroll}
      >
        {(["", "sent", "received"] as const).map((t) => {
          const active = filterType === t;
          const label = t === "" ? "All" : t === "sent" ? "Sent" : "Received";
          return (
            <TouchableOpacity
              key={`type-${t}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {(["7d", "month", "90d"] as const).map((v) => {
          const label = v === "7d" ? "7D" : v === "month" ? "Month" : "90D";
          const active = dateRange === v;
          return (
            <TouchableOpacity
              key={`date-${v}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDateRange(active ? "" : v)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {CATEGORIES.map((cat) => {
          const active = filterCategory === cat;
          return (
            <TouchableOpacity
              key={`cat-${cat}`}
              style={[
                styles.chip,
                active && {
                  backgroundColor: CATEGORY_COLORS[cat],
                  borderColor: CATEGORY_COLORS[cat],
                },
              ]}
              onPress={() =>
                setFilterCategory(filterCategory === cat ? "" : cat)
              }
            >
              <View
                style={[
                  styles.chipDot,
                  { backgroundColor: active ? "#fff" : CATEGORY_COLORS[cat] },
                ]}
              />
              <Text style={[styles.chipText, active && { color: "#fff" }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: 20 }}>
              <View style={styles.dayHeader}>
                <Skeleton width={70} height={11} radius={4} />
                <Skeleton width={50} height={11} radius={4} />
              </View>
              <View style={styles.dayCard}>
                <SkeletonTxRow />
                <SkeletonTxRow />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          renderItem={renderGroup}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={5}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter />}
          ListEmptyComponent={
            error ? (
              <EmptyState
                icon="wifi-off"
                tint="#ef4444"
                title="Couldn't load transactions"
                body={error}
                cta={{ label: "Retry", onPress: load }}
              />
            ) : search || filterCategory ? (
              <EmptyState
                icon="magnify-close"
                title="No matches"
                body={`Nothing matches "${search}". Try a different search or clear the filters.`}
              />
            ) : (
              <EmptyState
                icon="receipt-text-outline"
                title="No transactions yet"
                body="Sync your bank SMS or add a transaction manually to get started."
                cta={{
                  label: "Add transaction",
                  onPress: () => router.push("/(tabs)/add"),
                }}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
    fontFamily: fonts.extrabold,
  },
  countBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  countText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: "600",
    fontFamily: fonts.semibold,
  },

  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
  },

  chipScrollOuter: { height: 52, flexShrink: 0 },
  chipScroll: {
    paddingHorizontal: 16,
    alignItems: "center",
    flexDirection: "row",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
  chipTextActive: { color: "#fff" },
  chipDot: { width: 7, height: 7, borderRadius: 3 },

  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    flexGrow: 1,
  },

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
    color: colors.textMuted,
    letterSpacing: 0.5,
    fontFamily: fonts.bold,
  },
  dayTotal: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.monoRegular,
  },

  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  txRowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  txRowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  txRowSep: { borderBottomWidth: 1, borderBottomColor: colors.divider },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  txInfo: { flex: 1 },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 3,
    fontFamily: fonts.semibold,
  },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 3 },
  txMetaText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: fonts.monoBold,
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: "500",
    fontFamily: fonts.medium,
  },

  searchSummary: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  searchSummaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  searchSummaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bold,
  },
  searchSummarySpent: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
    fontFamily: fonts.monoBold,
  },
  searchSummaryDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 10,
  },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
    fontFamily: fonts.medium,
  },
  emptyHint: { color: colors.textDisabled, fontSize: 13, fontFamily: fonts.regular },
});
