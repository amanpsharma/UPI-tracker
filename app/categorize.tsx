import { useState } from "react";
import { View, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { format, isToday, isYesterday } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { api } from "@/services/api";
import { CATEGORY_COLORS, CATEGORIES } from "@/constants";
import { avatarStyle, CAT_DISPLAY, CAT_SHAPE } from "@/constants/ui";
import { showToast } from "@/services/toast";
import { Category } from "@/types";
import { colors, fonts, radius } from "@/constants/theme";

// Local CatIcon — slightly larger than the shared one to match this screen's design.
function CatIcon({ cat }: { cat: string }) {
  const color = CATEGORY_COLORS[cat as Category] ?? colors.textMuted;
  const shape = CAT_SHAPE[cat] ?? "circle";
  if (shape === "diamond") {
    return (
      <View style={styles.iconWrap}>
        <View style={[styles.iconDiamond, { backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.iconBase,
        { backgroundColor: color, borderRadius: shape === "circle" ? 8 : 4 },
      ]}
    />
  );
}

export default function CategorizeScreen() {
  const params = useLocalSearchParams<{
    id: string;
    amount: string;
    recipient: string;
    paidAt: string;
    type: string;
    category: string;
  }>();

  const [selected, setSelected] = useState<Category>(
    (params.category as Category) ?? "Other",
  );
  const [alwaysApply, setAlwaysApply] = useState(false);
  const [saving, setSaving] = useState(false);

  const av = avatarStyle(params.recipient || "U");
  const isSent = (params.type ?? "sent") === "sent";
  const paidAt = params.paidAt ? new Date(params.paidAt) : new Date();
  const dateLabel = isToday(paidAt)
    ? "Today"
    : isYesterday(paidAt)
      ? "Yesterday"
      : format(paidAt, "MMM d, yyyy");

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateTransaction(params.id!, { category: selected });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Categorized as ${selected}`, "success");
      router.back();
    } catch (err: any) {
      showToast(err?.message ?? "Failed to update category", "error");
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorize</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Transaction preview */}
        <View style={styles.txCard}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {(params.recipient || "U")[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txName} numberOfLines={1}>
              {params.recipient || "Unknown"}
            </Text>
            <Text style={styles.txDate}>
              {dateLabel} · {format(paidAt, "HH:mm")}
            </Text>
          </View>
          <Text
            style={[styles.txAmount, { color: isSent ? colors.text : colors.success }]}
          >
            {isSent ? "-" : "+"}₹
            {Number(params.amount || 0).toLocaleString("en-IN")}
          </Text>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>CHOOSE CATEGORY</Text>

        {/* Category list */}
        <View style={styles.catCard}>
          {CATEGORIES.map((cat, i) => {
            const isSelected = selected === cat;
            const isLast = i === CATEGORIES.length - 1;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catRow,
                  isSelected && styles.catRowSelected,
                  !isLast && styles.catRowBorder,
                ]}
                onPress={() => {
                  setSelected(cat);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.65}
              >
                <CatIcon cat={cat} />
                <Text
                  style={[
                    styles.catLabel,
                    isSelected && styles.catLabelSelected,
                  ]}
                >
                  {CAT_DISPLAY[cat] ?? cat}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={colors.success}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Always apply rule — lives inside the card as the last row */}
          <TouchableOpacity
            style={[styles.catRow, styles.alwaysRow]}
            onPress={() => setAlwaysApply((v) => !v)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.checkbox, alwaysApply && styles.checkboxActive]}
            >
              {alwaysApply && (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              )}
            </View>
            <Text style={styles.alwaysText} numberOfLines={2}>
              {"Always categorize "}
              <Text style={styles.alwaysBold}>{params.recipient}</Text>
              {" as "}
              <Text style={styles.alwaysBold}>
                {CAT_DISPLAY[selected] ?? selected}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bold,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },

  // Transaction card
  txCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700", fontFamily: fonts.bold },
  txInfo: { flex: 1 },
  txName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    fontFamily: fonts.semibold,
    marginBottom: 2,
  },
  txDate: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.regular },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "GeistMono_700Bold",
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    fontFamily: fonts.bold,
    paddingLeft: 2,
  },

  // Category card
  catCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  catRowSelected: { backgroundColor: colors.successSoft },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  catLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.text,
    fontFamily: fonts.medium,
  },
  catLabelSelected: { fontWeight: "600", fontFamily: fonts.semibold },

  // Category icons
  iconBase: { width: 16, height: 16 },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDiamond: {
    width: 12,
    height: 12,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },

  // Always apply row
  alwaysRow: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    alignItems: "flex-start",
    paddingVertical: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: colors.success, borderColor: colors.success },
  alwaysText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
  alwaysBold: {
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bold,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    fontFamily: fonts.bold,
  },
});
