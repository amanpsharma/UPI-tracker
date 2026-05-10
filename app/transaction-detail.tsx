import { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Text, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { format, isToday, isYesterday } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/services/api";
import { CATEGORY_COLORS } from "@/constants";
import { avatarStyle, CAT_DISPLAY } from "@/constants/ui";
import { showToast } from "@/services/toast";
import { Transaction } from "@/types";

const BG = "#f5f4f0";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today · ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
  return `${format(d, "dd MMM yyyy")} · ${format(d, "HH:mm")}`;
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      api
        .getTransaction(id)
        .then((data) => {
          setTx(data);
          setLoading(false);
        })
        .catch(() => router.back());
    }, [id]),
  );

  const navigateToEdit = (txData: Transaction) => {
    router.push({
      pathname: "/edit-transaction",
      params: {
        id: txData._id,
        amount: String(txData.amount),
        recipient: txData.recipient,
        note: txData.note ?? "",
        upiId: txData.upiId ?? "",
        bank: txData.bank ?? "",
        category: txData.category,
        type: txData.type ?? "sent",
        paidAt: txData.paidAt,
      },
    });
  };

  const handleDelete = () => {
    if (!tx) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Transaction",
      `Remove ₹${tx.amount.toLocaleString("en-IN")} paid to ${tx.recipient}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteTransaction(id!);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              showToast("Transaction deleted", "success");
              router.back();
            } catch (err: any) {
              showToast(err?.message ?? "Failed to delete", "error");
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const handleMenu = () => {
    if (!tx) return;
    Alert.alert("Options", undefined, [
      { text: "Edit Transaction", onPress: () => navigateToEdit(tx) },
      { text: "Delete", style: "destructive", onPress: handleDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRecategorize = () => {
    if (!tx) return;
    router.push({
      pathname: "/categorize",
      params: {
        id: tx._id,
        amount: String(tx.amount),
        recipient: tx.recipient,
        paidAt: tx.paidAt,
        type: tx.type ?? "sent",
        category: tx.category,
      },
    });
  };

  const handleAddNote = () => {
    if (!tx) return;
    if (Platform.OS === "ios") {
      Alert.prompt(
        tx.note ? "Edit Note" : "Add Note",
        undefined,
        async (text) => {
          if (text === null || text === undefined) return;
          try {
            const updated = await api.updateTransaction(tx._id, {
              note: text.trim(),
            });
            setTx(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast("Note saved", "success");
          } catch (err: any) {
            showToast(err?.message ?? "Failed to save note", "error");
          }
        },
        "plain-text",
        tx.note ?? "",
      );
    } else {
      navigateToEdit(tx);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator color="#111827" />
      </SafeAreaView>
    );
  }

  if (!tx) return null;

  const isSent = (tx.type ?? "sent") === "sent";
  const catColor = CATEGORY_COLORS[tx.category] ?? "#9ca3af";
  const av = avatarStyle(tx.recipient || "U");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={handleMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={20}
            color="#111827"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {(tx.recipient || "U")[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.recipientName}>{tx.recipient}</Text>
          <Text
            style={[styles.amount, { color: isSent ? "#111827" : "#16a34a" }]}
          >
            {isSent ? "-" : "+"}₹{tx.amount.toLocaleString("en-IN")}
          </Text>
          <View style={[styles.catPill, { backgroundColor: `${catColor}1a` }]}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <Text style={[styles.catPillText, { color: catColor }]}>
              {CAT_DISPLAY[tx.category] ?? tx.category}
            </Text>
          </View>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <DetailRow label="Date" value={formatDate(tx.paidAt)} />
          {tx.upiId ? (
            <>
              <CardDivider />
              <DetailRow label="UPI ID" value={tx.upiId} mono />
            </>
          ) : null}
          {tx.note ? (
            <>
              <CardDivider />
              <DetailRow label="Note" value={tx.note} />
            </>
          ) : null}
          {tx.transactionId ? (
            <>
              <CardDivider />
              <DetailRow
                label="Reference"
                value={tx.transactionId}
                mono
                truncate
              />
            </>
          ) : null}
          <CardDivider />
          <DetailRow
            label="Source"
            value={tx.source === "sms" ? "Auto (SMS)" : "Manual"}
          />
        </View>

        {/* Source SMS section */}
        {tx.source === "sms" && (
          <View style={styles.smsSection}>
            <Text style={styles.smsSectionLabel}>SOURCE SMS</Text>
            <View style={styles.smsBox}>
              <Text style={styles.smsText}>
                {[
                  tx.recipient && `Sent to ${tx.recipient}`,
                  tx.amount && `Rs.${tx.amount.toLocaleString("en-IN")}`,
                  tx.upiId && `via ${tx.upiId}`,
                  tx.transactionId && `UPI Ref ${tx.transactionId}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRecategorize}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Recategorize</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleAddNote}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>
              {tx.note ? "Edit note" : "Add note"}
            </Text>
          </TouchableOpacity>
        </View>

        {deleting && (
          <View style={styles.deletingRow}>
            <ActivityIndicator size="small" color="#ef4444" />
            <Text style={styles.deletingText}>Deleting…</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, mono && styles.rowValueMono]}
        numberOfLines={truncate ? 1 : undefined}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

function CardDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    backgroundColor: "#fff",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  hero: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 28,
    gap: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  recipientName: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  amount: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.5,
    fontFamily: "GeistMono_700Bold",
  },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catPillText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 20,
  },
  rowLabel: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "Inter_600SemiBold",
    textAlign: "right",
    flex: 1,
  },
  rowValueMono: {
    fontFamily: "GeistMono_400Regular",
    fontSize: 13,
    color: "#374151",
  },
  divider: { height: 1, backgroundColor: "#f3f4f6" },

  smsSection: { marginBottom: 20 },
  smsSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.8,
    fontFamily: "Inter_700Bold",
    marginBottom: 8,
    paddingLeft: 2,
  },
  smsBox: {
    backgroundColor: "#ededeb",
    borderRadius: 12,
    padding: 16,
  },
  smsText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },

  actions: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    fontFamily: "Inter_600SemiBold",
  },

  deletingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  deletingText: {
    fontSize: 13,
    color: "#ef4444",
    fontFamily: "Inter_400Regular",
  },
});
