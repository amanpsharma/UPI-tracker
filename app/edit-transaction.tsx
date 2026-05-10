import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Text, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { format, isToday, isYesterday } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/services/api";
import { CATEGORIES } from "@/constants";
import { CAT_DISPLAY } from "@/constants/ui";
import CatIcon from "@/components/CatIcon";
import { showToast } from "@/services/toast";
import { Category } from "@/types";

const BG = "#f5f4f0";
const BANKS = ["HDFC", "ICICI", "SBI", "Axis", "Kotak"];

export default function EditTransaction() {
  const params = useLocalSearchParams<{
    id: string;
    amount: string;
    recipient: string;
    note: string;
    upiId: string;
    category: string;
    type: string;
    paidAt: string;
  }>();

  const [txType, setTxType] = useState<"sent" | "received">(
    (params.type as "sent" | "received") ?? "sent",
  );
  const [amount, setAmount] = useState(params.amount ?? "");
  const [recipient, setRecipient] = useState(params.recipient ?? "");
  const [upiId, setUpiId] = useState(params.upiId ?? "");
  const [category, setCategory] = useState<Category>(
    (params.category as Category) ?? "Other",
  );
  const [bank, setBank] = useState("HDFC");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");

  useEffect(() => {
    if (params.amount) setAmount(params.amount);
    if (params.recipient) setRecipient(params.recipient);
    if (params.upiId) setUpiId(params.upiId);
    if (params.category) setCategory(params.category as Category);
    if (params.type) setTxType(params.type as "sent" | "received");
  }, [params.id]);

  const isValid =
    !!amount.trim() && parseFloat(amount) > 0 && !!recipient.trim();

  const txDate = params.paidAt ? new Date(params.paidAt) : new Date();
  const dateLabel = isToday(txDate)
    ? "Today"
    : isYesterday(txDate)
      ? "Yesterday"
      : format(txDate, "MMM d");
  const timeLabel = format(txDate, "HH:mm");

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!recipient.trim()) {
      setSnack("Recipient name is required.");
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      setSnack("Enter a valid amount.");
      return;
    }
    setSaving(true);
    try {
      await api.updateTransaction(params.id!, {
        amount: parsed,
        recipient: recipient.trim(),
        note: params.note ?? "",
        category,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Transaction updated", "success");
      router.back();
    } catch (err: any) {
      setSnack(err.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteTransaction(params.id!);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              showToast("Transaction deleted", "success");
              router.replace("/(tabs)/activity");
            } catch {
              setSnack("Failed to delete.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={22}
              color="#111827"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit transaction</Text>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={22}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Expense / Income toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                txType === "sent" && styles.toggleActive,
              ]}
              onPress={() => setTxType("sent")}
            >
              <Text
                style={[
                  styles.toggleText,
                  txType === "sent" && styles.toggleTextActive,
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleOption,
                txType === "received" && styles.toggleActive,
              ]}
              onPress={() => setTxType("received")}
            >
              <Text
                style={[
                  styles.toggleText,
                  txType === "received" && styles.toggleTextActive,
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>
                {txType === "sent" ? "-" : "+"}₹
              </Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#d1d5db"
              />
            </View>
          </View>

          {/* Merchant / Payee */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>MERCHANT / PAYEE</Text>
            <TextInput
              style={styles.textInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Enter merchant name"
              placeholderTextColor="#c4c4c4"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <TouchableOpacity
              style={[styles.selectRow, showCatPicker && styles.selectRowOpen]}
              onPress={() => setShowCatPicker((v) => !v)}
              activeOpacity={0.7}
            >
              <CatIcon cat={category} />
              <Text style={styles.selectText}>
                {CAT_DISPLAY[category] ?? category}
              </Text>
              <MaterialCommunityIcons
                name={showCatPicker ? "chevron-up" : "chevron-down"}
                size={18}
                color="#9ca3af"
              />
            </TouchableOpacity>
            {showCatPicker && (
              <View style={styles.catDropdown}>
                {CATEGORIES.map((cat, i) => {
                  const isSelected = cat === category;
                  const isLast = i === CATEGORIES.length - 1;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        isSelected && styles.catOptionSelected,
                        !isLast && styles.catOptionBorder,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCatPicker(false);
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <CatIcon cat={cat} />
                      <Text
                        style={[
                          styles.catOptionText,
                          isSelected && styles.catOptionTextActive,
                        ]}
                      >
                        {CAT_DISPLAY[cat] ?? cat}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={16}
                          color="#16a34a"
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Date + Time */}
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <View style={styles.selectRow}>
                <Text style={styles.selectText}>{dateLabel}</Text>
              </View>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>TIME</Text>
              <View style={styles.selectRow}>
                <Text style={styles.selectText}>{timeLabel}</Text>
              </View>
            </View>
          </View>

          {/* UPI ID */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>UPI ID (VPA)</Text>
            <TextInput
              style={styles.textInput}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="merchant@bank"
              placeholderTextColor="#c4c4c4"
              autoCapitalize="none"
            />
          </View>

          {/* Bank */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>BANK</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.banksRow}
            >
              {BANKS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.bankChip, bank === b && styles.bankChipActive]}
                  onPress={() => setBank(b)}
                >
                  <Text
                    style={[
                      styles.bankText,
                      bank === b && styles.bankTextActive,
                    ]}
                  >
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (!isValid || saving) && styles.primaryBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>
              {saving ? "Saving…" : "Save changes"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack("")}
        duration={3500}
      >
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const BOX = {
  backgroundColor: "#fff" as const,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e5e7eb" as const,
  paddingHorizontal: 14,
  paddingVertical: 13,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter_700Bold",
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },

  toggle: {
    flexDirection: "row",
    backgroundColor: "#e8e7e4",
    borderRadius: 12,
    padding: 4,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  toggleActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
    fontFamily: "Inter_600SemiBold",
  },
  toggleTextActive: { color: "#111827" },

  amountSection: { alignItems: "center", paddingVertical: 4 },
  amountRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  amountPrefix: {
    fontSize: 26,
    color: "#9ca3af",
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    marginRight: 4,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "GeistMono_700Bold",
    padding: 0,
    minWidth: 60,
  },

  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.7,
    fontFamily: "Inter_700Bold",
  },

  textInput: {
    ...BOX,
    fontSize: 15,
    color: "#111827",
    fontFamily: "Inter_400Regular",
  },

  selectRow: {
    ...BOX,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontFamily: "Inter_400Regular",
  },

  catDropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#e5e7eb",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },
  catOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  catOptionSelected: { backgroundColor: "#f0fdf4" },
  catOptionBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  catOptionText: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontFamily: "Inter_400Regular",
  },
  catOptionTextActive: { fontWeight: "600", fontFamily: "Inter_600SemiBold" },

  rowFields: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1, gap: 6 },

  banksRow: { flexDirection: "row", gap: 8 },
  bankChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#e8e7e4",
  },
  bankChipActive: { backgroundColor: "#111827" },
  bankText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter_600SemiBold",
  },
  bankTextActive: { color: "#fff" },

  bottomRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: "#e8e7e4",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter_600SemiBold",
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#111827",
  },
  primaryBtnDisabled: { backgroundColor: "#d1d5db" },
  primaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
});
