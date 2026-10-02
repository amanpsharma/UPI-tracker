import { useCallback, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { fmtShort } from '@/utils/format';
import { Transaction } from '@/types';
import { colors, fonts, radius } from '@/constants/theme';

export default function RecipientTransactionsScreen() {
  const { recipient, month } = useLocalSearchParams<{ recipient: string; month?: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const recipientName = recipient ?? 'Unknown';

  const load = useCallback(async () => {
    setError('');
    try {
      const params: any = { search: recipientName, limit: 500 };
      if (month) {
        const [y, m] = month.split('-').map(Number);
        params.from = new Date(y, m - 1, 1).toISOString();
        params.to = new Date(y, m, 0, 23, 59, 59).toISOString();
      }
      const data = await api.getTransactions(params);
      // Filter to exact recipient match
      const filtered = data.filter(
        (tx) => tx.recipient === recipientName || tx.upiId === recipientName,
      );
      setTransactions(filtered);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientName, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const totalSent = useMemo(
    () =>
      transactions.filter((t) => (t.type ?? 'sent') === 'sent').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );
  const totalReceived = useMemo(
    () => transactions.filter((t) => t.type === 'received').reduce((s, t) => s + t.amount, 0),
    [transactions],
  );

  const renderItem = useCallback(({ item }: { item: Transaction }) => {
    const isSent = (item.type ?? 'sent') === 'sent';
    const catColor = CATEGORY_COLORS[item.category] ?? colors.textMuted;
    const dateStr = format(new Date(item.paidAt), 'd MMM yyyy, h:mm a');

    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/transaction-detail', params: { id: item._id } })}
      >
        <View style={[styles.txIcon, { backgroundColor: `${catColor}18` }]}>
          <MaterialCommunityIcons
            name={(CATEGORY_ICONS[item.category] as any) ?? 'swap-horizontal'}
            size={18}
            color={catColor}
          />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txNote} numberOfLines={1}>
            {item.note || item.category}
          </Text>
          <Text style={styles.txDate}>{dateStr}</Text>
        </View>
        <Text style={[styles.txAmount, { color: isSent ? colors.danger : colors.success }]}>
          {isSent ? '-' : '+'}₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {recipientName}
          </Text>
          <Text style={styles.headerSub}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {month
              ? ` · ${format(new Date(Number(month.split('-')[0]), Number(month.split('-')[1]) - 1), 'MMM yyyy')}`
              : ''}
          </Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {totalSent > 0 && (
          <View style={[styles.summaryChip, { backgroundColor: colors.dangerSoft }]}>
            <MaterialCommunityIcons name="arrow-up" size={14} color={colors.danger} />
            <Text style={[styles.summaryChipText, { color: colors.danger }]}>
              Sent {fmtShort(totalSent)}
            </Text>
          </View>
        )}
        {totalReceived > 0 && (
          <View style={[styles.summaryChip, { backgroundColor: colors.successSoft }]}>
            <MaterialCommunityIcons name="arrow-down" size={14} color={colors.success} />
            <Text style={[styles.summaryChipText, { color: colors.success }]}>
              Received {fmtShort(totalReceived)}
            </Text>
          </View>
        )}
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="wifi-off" size={40} color={colors.textMuted} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="receipt" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No transactions found</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={15}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: colors.text, fontFamily: fonts.bold },
  headerSub: { fontSize: 12, color: colors.textMuted, fontFamily: fonts.medium },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  summaryChipText: { fontSize: 13, fontWeight: '600', fontFamily: fonts.semibold },

  list: { paddingHorizontal: 16, paddingBottom: 16 },

  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txInfo: { flex: 1, gap: 3 },
  txNote: { fontSize: 14, fontWeight: '600', color: colors.text, fontFamily: fonts.semibold },
  txDate: { fontSize: 11, color: colors.textMuted, fontFamily: fonts.regular },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: fonts.monoBold },

  errorText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: fonts.semibold },
  emptyText: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
});
