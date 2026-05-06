import { useCallback, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { subDays, startOfMonth } from "date-fns";
import {
  Text,
  Searchbar,
  Menu,
  Divider,
  IconButton,
  ActivityIndicator,
  Chip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { format } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/services/api";
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from "@/constants";
import { Category, Transaction, TransactionType } from "@/types";
import SwipeableRow from "@/components/SwipeableRow";

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "">("");
  const [filterType, setFilterType] = useState<TransactionType | "">("");
  const [dateRange, setDateRange] = useState<"7d" | "month" | "90d" | "">("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const dateRangeOptions: {
    label: string;
    value: "7d" | "month" | "90d" | "";
  }[] = [
    { label: "All", value: "" },
    { label: "7D", value: "7d" },
    { label: "Month", value: "month" },
    { label: "90D", value: "90d" },
  ];

  const getFromDate = (range: typeof dateRange): string | undefined => {
    if (range === "7d") return subDays(new Date(), 7).toISOString();
    if (range === "month") return startOfMonth(new Date()).toISOString();
    if (range === "90d") return subDays(new Date(), 90).toISOString();
    return undefined;
  };

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await api.getTransactions({
        category: filterCategory || undefined,
        type: filterType || undefined,
        from: getFromDate(dateRange),
        limit: 10000,
      });
      setTransactions(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterType, dateRange]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      tx.recipient.toLowerCase().includes(q) ||
      tx.upiId.toLowerCase().includes(q) ||
      (tx.note ?? "").toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <SwipeableRow
      onDelete={() => handleDelete(item._id)}
      onPress={() =>
        router.push({
          pathname: "/transaction-detail",
          params: { id: item._id },
        })
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View
            style={[
              styles.icon,
              { backgroundColor: `${CATEGORY_COLORS[item.category]}20` },
            ]}
          >
            <MaterialCommunityIcons
              name={CATEGORY_ICONS[item.category] as any}
              size={22}
              color={CATEGORY_COLORS[item.category] || "#6200ee"}
            />
          </View>
          <View style={styles.info}>
            <Text
              variant="titleMedium"
              style={styles.recipientText}
              numberOfLines={1}
            >
              {item.recipient || "Unknown"}
            </Text>
            {item.note ? (
              <Text style={styles.note} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
            {!item.note && item.upiId ? (
              <Text style={styles.upi} numberOfLines={1}>
                {item.upiId}
              </Text>
            ) : null}
            <Text style={styles.date}>
              {format(new Date(item.paidAt), "MMM dd, hh:mm a")}
            </Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <Text variant="titleMedium" style={styles.amount}>
            ₹ {item.amount.toLocaleString("en-IN")}
          </Text>
          <View style={styles.pillRow}>
            <View
              style={[
                styles.badge,
                (item.type ?? "sent") === "sent"
                  ? styles.sentBadge
                  : styles.receivedBadge,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  (item.type ?? "sent") === "sent" ? "arrow-up" : "arrow-down"
                }
                size={11}
                color={(item.type ?? "sent") === "sent" ? "#dc2626" : "#059669"}
              />
              <Text
                style={[
                  styles.badgeText,
                  (item.type ?? "sent") === "sent"
                    ? styles.sentBadgeText
                    : styles.receivedBadgeText,
                ]}
              >
                {(item.type ?? "sent") === "sent" ? "Sent" : "Received"}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                item.source === "sms" ? styles.smsBadge : styles.manualBadge,
              ]}
            >
              <MaterialCommunityIcons
                name={
                  item.source === "sms"
                    ? "message-processing-outline"
                    : "hand-pointing-up"
                }
                size={11}
                color={item.source === "sms" ? "#059669" : "#6200ee"}
              />
              <Text
                style={[
                  styles.badgeText,
                  item.source === "sms"
                    ? styles.smsBadgeText
                    : styles.manualBadgeText,
                ]}
              >
                {item.source === "sms" ? "Auto" : "Manual"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SwipeableRow>
  );

  const ListHeader = () => (
    <View style={styles.listHeaderContainer}>
      {/* Active filter chip */}
      {filterCategory ? (
        <View style={styles.activeFilter}>
          <Chip
            icon={() => (
              <MaterialCommunityIcons
                name={CATEGORY_ICONS[filterCategory] as any}
                size={14}
                color="#fff"
              />
            )}
            style={[
              styles.filterChip,
              { backgroundColor: CATEGORY_COLORS[filterCategory] },
            ]}
            textStyle={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
            onClose={() => setFilterCategory("")}
            closeIcon={() => (
              <MaterialCommunityIcons
                name="close-circle"
                size={16}
                color="#fff"
              />
            )}
          >
            {filterCategory}
          </Chip>
          <Text style={styles.resultCount}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.heading}>
          Payment History
        </Text>
        {!loading && (
          <Text style={styles.totalCount}>{transactions.length} total</Text>
        )}
      </View>

      {/* Sent / Received chips */}
      <View style={styles.typeRow}>
        {(["", "sent", "received"] as const).map((t) => {
          const active = filterType === t;
          const label =
            t === "" ? "All" : t === "sent" ? "↑ Sent" : "↓ Received";
          const bg = active
            ? t === "sent"
              ? "#dc2626"
              : t === "received"
                ? "#059669"
                : "#6200ee"
            : "#fff";
          const color = active
            ? "#fff"
            : t === "sent"
              ? "#dc2626"
              : t === "received"
                ? "#059669"
                : "#555";
          return (
            <TouchableOpacity
              key={t}
              style={[
                styles.typeChip,
                { backgroundColor: bg, borderColor: active ? bg : "#e5e7eb" },
              ]}
              onPress={() => {
                setFilterType(t);
                setLoading(true);
              }}
            >
              <Text style={[styles.typeChipText, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date range chips */}
      <View style={styles.typeRow}>
        {dateRangeOptions.map(({ label, value }) => {
          const active = dateRange === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => {
                setDateRange(value);
                setLoading(true);
              }}
            >
              <Text
                style={[
                  styles.dateChipText,
                  active && styles.dateChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search + filter */}
      <View style={styles.filterRow}>
        <Searchbar
          placeholder="Search name, note..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
          inputStyle={{ fontSize: 14, color: "#1f2937" }}
          placeholderTextColor="#9ca3af"
          iconColor="#6b7280"
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentStyle={{ backgroundColor: "#fff", borderRadius: 12 }}
          anchor={
            <IconButton
              icon="filter-variant"
              mode={filterCategory ? "contained" : "contained-tonal"}
              containerColor={
                filterCategory ? CATEGORY_COLORS[filterCategory] : "#ffffff"
              }
              iconColor={filterCategory ? "#fff" : "#4b5563"}
              size={24}
              style={styles.filterBtn}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            title="All categories"
            leadingIcon="view-grid"
            onPress={() => {
              setFilterCategory("");
              setMenuVisible(false);
            }}
          />
          <Divider />
          {CATEGORIES.map((c) => (
            <Menu.Item
              key={c}
              title={c}
              leadingIcon={CATEGORY_ICONS[c]}
              onPress={() => {
                setFilterCategory(c);
                setMenuVisible(false);
              }}
            />
          ))}
        </Menu>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6200ee" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6200ee"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons
                name={error ? "wifi-off" : "receipt-text-outline"}
                size={40}
                color="#ccc"
              />
              <Text style={[styles.emptyText, error ? styles.errorText : null]}>
                {error ||
                  (search || filterCategory
                    ? "No results found."
                    : "No transactions yet.")}
              </Text>
              {!error && !search && !filterCategory && (
                <Text style={styles.emptyHint}>
                  Sync from SMS or add manually.
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: { fontWeight: "800", color: "#111827", fontSize: 28 },
  totalCount: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: "500",
    paddingBottom: 4,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  search: {
    flex: 1,
    height: 48,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  filterBtn: {
    margin: 0,
    height: 48,
    width: 48,
    borderRadius: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    backgroundColor: "#fff",
  },
  list: { padding: 16, paddingTop: 4, flexGrow: 1 },
  listHeaderContainer: { marginBottom: 8 },
  activeFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  filterChip: { elevation: 2 },
  resultCount: { color: "#aaa", fontSize: 13, fontWeight: "500" },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1, gap: 14 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: { flex: 1, justifyContent: "center" },
  recipientText: {
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
    fontSize: 15,
  },
  note: { color: "#4b5563", fontSize: 13, marginBottom: 2 },
  upi: { color: "#6b7280", fontSize: 12, marginBottom: 2 },
  date: { color: "#9ca3af", fontSize: 11, fontWeight: "500" },
  rightSection: { alignItems: "flex-end", justifyContent: "center", gap: 6 },
  amount: { fontWeight: "800", color: "#111827", fontSize: 16 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  pillRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  sentBadge: { backgroundColor: "#fee2e2" },
  sentBadgeText: { color: "#dc2626" },
  receivedBadge: { backgroundColor: "#d1fae5" },
  receivedBadgeText: { color: "#059669" },
  smsBadge: { backgroundColor: "#eff6ff" },
  smsBadgeText: { color: "#2563eb" },
  manualBadge: { backgroundColor: "#ede9fe" },
  manualBadgeText: { color: "#6d28d9" },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontWeight: "700" },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  dateChipActive: { backgroundColor: "#6200ee", borderColor: "#6200ee" },
  dateChipText: { fontSize: 12, fontWeight: "700", color: "#555" },
  dateChipTextActive: { color: "#fff" },
  emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { color: "#9ca3af", fontSize: 16, fontWeight: "500" },
  emptyHint: { color: "#d1d5db", fontSize: 13 },
  errorText: { color: "#ef4444" },
});
