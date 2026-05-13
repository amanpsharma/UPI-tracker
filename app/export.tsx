import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { subDays, startOfMonth } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/services/api";
import { showToast } from "@/services/toast";
import {
  generateCsv,
  csvFilename,
  COLUMN_PREVIEW,
  ExportDateRange,
} from "@/utils/exportCsv";

const BG = "#f5f4f0";

type Destination = "csv" | "sheets";

// ─── Destination card ─────────────────────────────────────────────────────────
function DestinationCard({
  type,
  selected,
  onPress,
}: {
  type: Destination;
  selected: boolean;
  onPress: () => void;
}) {
  const isSheets = type === "sheets";
  return (
    <TouchableOpacity
      style={[styles.destCard, selected && styles.destCardSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.destIcon,
          selected && isSheets && styles.destIconSelectedSheets,
          selected && !isSheets && styles.destIconSelectedCsv,
        ]}
      >
        <MaterialCommunityIcons
          name={isSheets ? "google-spreadsheet" : "file-delimited-outline"}
          size={22}
          color={selected ? (isSheets ? "#16a34a" : "#2563eb") : "#9ca3af"}
        />
      </View>
      <View style={styles.destText}>
        <Text style={styles.destTitle}>
          {isSheets ? "Google Sheets" : "Download CSV"}
        </Text>
        <Text style={styles.destSub}>
          {isSheets
            ? "Auto-sync new transactions"
            : "One-time export to Files"}
        </Text>
      </View>
      {selected && (
        <MaterialCommunityIcons
          name="check"
          size={18}
          color={isSheets ? "#16a34a" : "#2563eb"}
        />
      )}
    </TouchableOpacity>
  );
}

// ─── Date range chip ──────────────────────────────────────────────────────────
function RangeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.rangeChip, active && styles.rangeChipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.rangeChipText, active && styles.rangeChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ExportScreen() {
  const [destination, setDestination] = useState<Destination>("sheets");
  const [dateRange, setDateRange] = useState<ExportDateRange>("month");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (destination === "sheets") {
      // Google Sheets requires a configured OAuth client ID.
      // Guide the user to set it up; open Google Cloud Console.
      Alert.alert(
        "Google Sheets",
        "Connect your Google account to enable auto-sync. You'll need a Google Sheets API key configured in your .env file.\n\nOpen documentation?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Docs",
            onPress: () =>
              WebBrowser.openBrowserAsync(
                "https://developers.google.com/sheets/api/quickstart",
              ),
          },
        ],
      );
      return;
    }

    // ── CSV export ────────────────────────────────────────────────────────────
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const from =
        dateRange === "7d"
          ? subDays(new Date(), 7).toISOString()
          : dateRange === "month"
            ? startOfMonth(new Date()).toISOString()
            : undefined;

      const transactions = await api.getTransactions({
        from,
        limit: 5000,
      });

      if (transactions.length === 0) {
        showToast("No transactions found for the selected range.", "info");
        return;
      }

      const csv = generateCsv(transactions);
      const filename = csvFilename(dateRange);

      await Share.share(
        {
          message: csv,
          title: filename,
        },
        { dialogTitle: `Save ${filename}` },
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      // User cancelled the share sheet — not an error
      if (err?.message?.includes("cancel")) return;
      showToast(err?.message ?? "Export failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const ctaLabel =
    destination === "sheets" ? "Connect & sync" : "Download CSV";

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/(tabs)/settings")
          }
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Export</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── DESTINATION ──────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>DESTINATION</Text>
        <View style={styles.destGroup}>
          <DestinationCard
            type="sheets"
            selected={destination === "sheets"}
            onPress={() => setDestination("sheets")}
          />
          <View style={styles.destDivider} />
          <DestinationCard
            type="csv"
            selected={destination === "csv"}
            onPress={() => setDestination("csv")}
          />
        </View>

        {/* ── DATE RANGE ───────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DATE RANGE</Text>
        <View style={styles.rangeRow}>
          {(
            [
              { key: "7d", label: "Last 7 days" },
              { key: "month", label: "This month" },
              { key: "all", label: "All time" },
            ] as { key: ExportDateRange; label: string }[]
          ).map(({ key, label }) => (
            <RangeChip
              key={key}
              label={label}
              active={dateRange === key}
              onPress={() => setDateRange(key)}
            />
          ))}
        </View>

        {/* ── COLUMNS ──────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>COLUMNS</Text>
        <View style={styles.columnsBox}>
          <Text style={styles.columnsText}>{COLUMN_PREVIEW}</Text>
        </View>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.ctaBtn, loading && styles.ctaBtnLoading]}
          onPress={handleExport}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        {destination === "sheets" && (
          <Text style={styles.sheetsNote}>
            Requires a Google Sheets API key in your environment.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Inter_800ExtraBold",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: 0.9,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },

  // Destination cards
  destGroup: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  destCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  destCardSelected: {
    backgroundColor: "#f0fdf4",
  },
  destIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  destIconSelectedSheets: { backgroundColor: "#dcfce7" },
  destIconSelectedCsv: { backgroundColor: "#dbeafe" },
  destText: { flex: 1 },
  destTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  destSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "Inter_400Regular",
  },
  destDivider: { height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 16 },

  // Date range chips
  rangeRow: {
    flexDirection: "row",
    gap: 8,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  rangeChipActive: {
    backgroundColor: "#111827",
  },
  rangeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter_600SemiBold",
  },
  rangeChipTextActive: {
    color: "#fff",
  },

  // Columns preview
  columnsBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  columnsText: {
    fontSize: 13,
    color: "#6b7280",
    fontFamily: "GeistMono_400Regular",
    lineHeight: 20,
  },

  // CTA
  ctaBtn: {
    marginTop: 32,
    backgroundColor: "#111827",
    borderRadius: 28,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnLoading: { opacity: 0.7 },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Inter_700Bold",
  },
  sheetsNote: {
    fontSize: 12,
    color: "#c4c4c4",
    textAlign: "center",
    marginTop: 12,
    fontFamily: "Inter_400Regular",
  },
});
