import { useCallback, useMemo, useState } from "react";
import {
  View,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { format, subDays } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { api } from "@/services/api";
import { CATEGORY_COLORS } from "@/constants";
import { avatarStyle } from "@/constants/ui";
import { showToast } from "@/services/toast";
import { Transaction } from "@/types";

// Uses subDays to correctly handle DST boundaries instead of fixed ms arithmetic
function getDayLabel(dateStr: string): string {
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  return format(new Date(y, m - 1, d), "EEE, d MMM yyyy");
}

type Section = {
  title: string;
  total: number;
  receivedTotal: number;
  data: Transaction[];
};

export default function TransactionsMonthScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const monthStr = month ?? format(new Date(), "yyyy-MM");
  const isValidMonth = /^\d{4}-\d{2}$/.test(monthStr);

  const { monthStart, monthTitle } = useMemo(() => {
    if (!isValidMonth) {
      const now = new Date();
      return { monthStart: now, monthTitle: format(now, "MMMM yyyy") };
    }
    const [y, m] = monthStr.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    return { monthStart: start, monthTitle: format(start, "MMMM yyyy") };
  }, [monthStr, isValidMonth]);

  const load = useCallback(async () => {
    setError("");
    try {
      const from = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        1,
      ).toISOString();
      const to = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0,
        23,
        59,
        59,
      ).toISOString();
      const data = await api.getTransactions({ from, to, limit: 500 });
      setTransactions(data);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to load transactions.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [monthStart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const { sections, totalSent } = useMemo(() => {
    const dateMap: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      const key = format(new Date(tx.paidAt), "yyyy-MM-dd");
      if (!dateMap[key]) dateMap[key] = [];
      dateMap[key].push(tx);
    }

    const secs: Section[] = [];
    let sentSum = 0;
    let receivedSum = 0;

    Object.entries(dateMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, txs]) => {
        let dayTotal = 0;
        let dayReceived = 0;
        for (const tx of txs) {
          if ((tx.type ?? "sent") === "sent") {
            dayTotal += tx.amount;
            sentSum += tx.amount;
          } else {
            dayReceived += tx.amount;
            receivedSum += tx.amount;
          }
        }
        secs.push({
          title: getDayLabel(date),
          total: dayTotal,
          receivedTotal: dayReceived,
          data: txs,
        });
      });

    return { sections: secs, totalSent: sentSum };
  }, [transactions]);

  const sentCount = useMemo(
    () => transactions.filter((tx) => (tx.type ?? "sent") === "sent").length,
    [transactions],
  );
  const receivedCount = transactions.length - sentCount;

  const renderItem = ({ item }: { item: Transaction }) => {
    const av = avatarStyle(item.recipient || "U");
    const isSent = (item.type ?? "sent") === "sent";
    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: "/transaction-detail",
            params: { id: item._id },
          })
        }
      >
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {(item.recipient || "U")[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txName} numberOfLines={1}>
            {item.recipient}
          </Text>
          <View style={styles.txMeta}>
            <View
              style={[
                styles.catDot,
                {
                  backgroundColor:
                    CATEGORY_COLORS[item.category] ?? "#A0A0A0",
                },
              ]}
            />
            <Text style={styles.txMetaText}>
              {item.category} · {format(new Date(item.paidAt), "HH:mm")}
            </Text>
          </View>
        </View>
        <Text
          style={[styles.txAmount, { color: isSent ? "#111827" : "#16a34a" }]}
        >
          {isSent ? "-" : "+"}₹{item.amount.toLocaleString("en-IN")}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{section.title}</Text>
      <View style={styles.sectionTotals}>
        {section.receivedTotal > 0 && (
          <Text style={[styles.sectionTotal, { color: "#16a34a" }]}>
            +₹{section.receivedTotal.toLocaleString("en-IN")}
          </Text>
        )}
        {section.total > 0 && (
          <Text style={styles.sectionTotal}>
            -₹{section.total.toLocaleString("en-IN")}
          </Text>
        )}
      </View>
    </View>
  );

  const headerSub = useMemo(() => {
    if (loading) return "";
    const parts: string[] = [];
    if (sentCount > 0) parts.push(`${sentCount} sent`);
    if (receivedCount > 0) parts.push(`${receivedCount} received`);
    if (parts.length === 0) return "No transactions";
    if (totalSent > 0) parts.push(`-₹${totalSent.toLocaleString("en-IN")}`);
    return parts.join(" · ");
  }, [loading, sentCount, receivedCount, totalSent]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/history")
          }
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{monthTitle}</Text>
          {headerSub ? (
            <Text style={styles.headerSub}>{headerSub}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color="#e5e7eb" />
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons
            name="receipt-text-outline"
            size={40}
            color="#e5e7eb"
          />
          <Text style={styles.emptyText}>No transactions in {monthTitle}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1a1a1a"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f5f5f5",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  headerSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sectionDate: { fontSize: 12, fontWeight: "700", color: "#6b7280" },
  sectionTotals: { flexDirection: "row", gap: 6 },
  sectionTotal: { fontSize: 12, color: "#9ca3af", fontWeight: "500" },

  // Transaction row
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  separator: { height: 6 },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "GeistMono_600SemiBold",
  },
  txInfo: { flex: 1 },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "GeistMono_600SemiBold",
    marginBottom: 3,
  },
  txMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  txMetaText: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "GeistMono_600SemiBold",
  },
  txAmount: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "GeistMono_600SemiBold",
  },

  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "GeistMono_600SemiBold",
    textAlign: "center",
  },

  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#111827",
    borderRadius: 20,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
