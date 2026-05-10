import { useCallback, useState } from 'react';
import {
  View, SectionList, StyleSheet, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { avatarStyle } from '@/constants/ui';
import { Transaction } from '@/types';

function getDayLabel(dateStr: string): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(
    new Date(Date.now() - 86400000),
    'yyyy-MM-dd',
  );
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  return format(new Date(y, m - 1, d), 'EEE, d MMM');
}

type Section = { title: string; total: number; data: Transaction[] };

export default function TransactionsMonthScreen() {
  const { month } = useLocalSearchParams<{ month: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Parse month param (YYYY-MM)
  const [y, m] = (month ?? format(new Date(), 'yyyy-MM')).split('-').map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0, 23, 59, 59);
  const monthTitle = format(monthStart, 'MMMM yyyy');

  const load = useCallback(async () => {
    try {
      const data = await api.getTransactions({
        from: startOfMonth(monthStart).toISOString(),
        to: endOfMonth(monthStart).toISOString(),
        limit: 500,
      });
      setTransactions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  // Group by date
  const sections: Section[] = [];
  const dateMap: Record<string, Transaction[]> = {};
  transactions.forEach(tx => {
    const key = format(new Date(tx.paidAt), 'yyyy-MM-dd');
    if (!dateMap[key]) dateMap[key] = [];
    dateMap[key].push(tx);
  });
  Object.entries(dateMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([date, txs]) => {
      const dayTotal = txs
        .filter(tx => (tx.type ?? 'sent') === 'sent')
        .reduce((s, tx) => s + tx.amount, 0);
      sections.push({ title: getDayLabel(date), total: dayTotal, data: txs });
    });

  const totalSpent = transactions
    .filter(tx => (tx.type ?? 'sent') === 'sent')
    .reduce((s, tx) => s + tx.amount, 0);

  const renderItem = ({ item }: { item: Transaction }) => {
    const av = avatarStyle(item.recipient || 'U');
    const isSent = (item.type ?? 'sent') === 'sent';
    return (
      <TouchableOpacity
        style={styles.txRow}
        activeOpacity={0.7}
        onPress={() =>
          router.push({ pathname: '/transaction-detail', params: { id: item._id } })
        }
      >
        <View style={[styles.avatar, { backgroundColor: av.bg }]}>
          <Text style={[styles.avatarText, { color: av.text }]}>
            {(item.recipient || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txName} numberOfLines={1}>{item.recipient}</Text>
          <View style={styles.txMeta}>
            <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
            <Text style={styles.txMetaText}>
              {item.category} · {format(new Date(item.paidAt), 'HH:mm')}
            </Text>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: isSent ? '#111827' : '#16a34a' }]}>
          {isSent ? '-' : '+'}₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionDate}>{section.title}</Text>
      {section.total > 0 && (
        <Text style={styles.sectionTotal}>-₹{section.total.toLocaleString('en-IN')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{monthTitle}</Text>
          {!loading && (
            <Text style={styles.headerSub}>
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              {totalSpent > 0 ? ` · -₹${totalSpent.toLocaleString('en-IN')}` : ''}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a1a1a" />
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="receipt-text-outline" size={40} color="#e5e7eb" />
          <Text style={styles.emptyText}>No transactions in {monthTitle}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1a1a1a" />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginTop: 1 },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 20, paddingBottom: 8, paddingHorizontal: 4,
  },
  sectionDate: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  sectionTotal: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },

  // Transaction row
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14,
  },
  separator: { height: 6 },

  avatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  txMetaText: { fontSize: 12, color: '#9ca3af' },
  txAmount: { fontSize: 14, fontWeight: '700' },

  emptyText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
});
