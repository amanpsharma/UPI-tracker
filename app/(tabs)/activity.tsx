import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  ActivityIndicator as RNActivityIndicator, ScrollView,
} from 'react-native';
import { subDays, startOfMonth, format } from 'date-fns';
import { Text, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { CATEGORIES, CATEGORY_COLORS } from '@/constants';
import { avatarStyle } from '@/constants/ui';
import { fmtShort } from '@/utils/format';
import { Category, Transaction, TransactionType } from '@/types';
import SwipeableRow from '@/components/SwipeableRow';
import Skeleton, { SkeletonTxRow } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';

const PAGE_SIZE = 50;

type DayGroup = {
  date: string;
  label: string;
  sentTotal: number;
  transactions: Transaction[];
};

export default function ActivityScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [dateRange, setDateRange] = useState<'7d' | 'month' | '90d' | ''>('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const skipRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const getFromDate = (range: typeof dateRange): string | undefined => {
    if (range === '7d') return subDays(new Date(), 7).toISOString();
    if (range === 'month') return startOfMonth(new Date()).toISOString();
    if (range === '90d') return subDays(new Date(), 90).toISOString();
    return undefined;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
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
      setError(err.message ?? 'Failed to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterType, dateRange, debouncedSearch]);

  // Re-fetch whenever filters / search / date range change
  useEffect(() => { load(); }, [load]);

  // Also re-fetch when the tab regains focus (picks up transactions added elsewhere)
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    } catch {
      // silent — user can pull-to-refresh
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
    skipRef.current = Math.max(0, skipRef.current - 1);
  };

  // Group transactions by calendar date
  const groups = useMemo<DayGroup[]>(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const map: Record<string, DayGroup> = {};
    const order: string[] = [];

    for (const tx of transactions) {
      const date = format(new Date(tx.paidAt), 'yyyy-MM-dd');
      if (!map[date]) {
        const label =
          date === today ? 'TODAY'
          : date === yesterday ? 'YESTERDAY'
          : format(new Date(tx.paidAt), 'MMM d');
        map[date] = { date, label, sentTotal: 0, transactions: [] };
        order.push(date);
      }
      map[date].transactions.push(tx);
      if ((tx.type ?? 'sent') === 'sent') map[date].sentTotal += tx.amount;
    }

    return order.map((d) => map[d]);
  }, [transactions]);

  const renderGroup = ({ item: group }: { item: DayGroup }) => (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{group.label}</Text>
        {group.sentTotal > 0 && (
          <Text style={styles.dayTotal}>-{fmtShort(group.sentTotal)}</Text>
        )}
      </View>
      <View style={styles.dayCard}>
        {group.transactions.map((tx, i) => {
          const av = avatarStyle(tx.recipient || 'U');
          const isSent = (tx.type ?? 'sent') === 'sent';
          const isFirst = i === 0;
          const isLast = i === group.transactions.length - 1;
          return (
            <SwipeableRow
              key={tx._id}
              stripped
              onDelete={() => handleDelete(tx._id)}
              onPress={() => router.push({ pathname: '/transaction-detail', params: { id: tx._id } })}
            >
              <View style={[
                styles.txRow,
                isFirst && styles.txRowFirst,
                isLast && styles.txRowLast,
                !isLast && styles.txRowSep,
              ]}>
                <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                  <Text style={[styles.avatarText, { color: av.text }]}>
                    {(tx.recipient || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txName} numberOfLines={1}>{tx.recipient || 'Unknown'}</Text>
                  <View style={styles.txMeta}>
                    <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[tx.category] }]} />
                    <Text style={styles.txMetaText}>
                      {tx.category} · {format(new Date(tx.paidAt), 'HH:mm')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.txAmount, { color: isSent ? '#111827' : '#16a34a' }]}>
                  {isSent ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </SwipeableRow>
          );
        })}
      </View>
    </View>
  );

  // Total spent (sent only) across loaded matches — shown in the search summary
  const searchSpentTotal = useMemo(() => {
    if (!debouncedSearch.trim()) return 0;
    return transactions.reduce(
      (sum, tx) => sum + ((tx.type ?? 'sent') === 'sent' ? tx.amount : 0),
      0,
    );
  }, [transactions, debouncedSearch]);

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <RNActivityIndicator size="small" color="#9ca3af" />
          <Text style={styles.footerText}>Loading more…</Text>
        </View>
      );
    }

    const hasSearch = debouncedSearch.trim().length > 0;

    // Search summary — only shown when there's an active search and results
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
              -₹{searchSpentTotal.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      );
    }

    if (!hasMore && transactions.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>All {transactions.length} transactions loaded</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        {totalCount !== null && (
          <Text style={styles.subtitle}>{totalCount.toLocaleString('en-IN')} transactions</Text>
        )}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search merchant..."
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14, color: '#1f2937', fontFamily: 'Inter_400Regular' }}
          placeholderTextColor="#9ca3af"
          iconColor="#9ca3af"
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
        {/* Type: All / Sent / Received */}
        {(['', 'sent', 'received'] as const).map((t) => {
          const active = filterType === t;
          const label = t === '' ? 'All' : t === 'sent' ? 'Sent' : 'Received';
          return (
            <TouchableOpacity
              key={`type-${t}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Date range */}
        {(['7d', 'month', '90d'] as const).map((v) => {
          const label = v === '7d' ? '7D' : v === 'month' ? 'Month' : '90D';
          const active = dateRange === v;
          return (
            <TouchableOpacity
              key={`date-${v}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setDateRange(active ? '' : v)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Category chips with colored dots */}
        {CATEGORIES.map((cat) => {
          const active = filterCategory === cat;
          return (
            <TouchableOpacity
              key={`cat-${cat}`}
              style={[
                styles.chip,
                active && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] },
              ]}
              onPress={() => setFilterCategory(filterCategory === cat ? '' : cat)}
            >
              <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : CATEGORY_COLORS[cat] }]} />
              <Text style={[styles.chipText, active && { color: '#fff' }]}>{cat}</Text>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
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
                cta={{ label: 'Retry', onPress: load }}
              />
            ) : search || filterCategory ? (
              <EmptyState
                icon="magnify-close"
                title="No matches"
                body={`Nothing matches “${search}”. Try a different search or clear the filters.`}
              />
            ) : (
              <EmptyState
                icon="receipt-text-outline"
                title="No transactions yet"
                body="Sync your bank SMS or add a transaction manually to get started."
                cta={{ label: 'Add transaction', onPress: () => router.push('/(tabs)/add') }}
              />
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5, fontFamily: 'Inter_800ExtraBold' },
  subtitle: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginTop: 3, fontFamily: 'Inter_500Medium' },

  searchRow: { paddingHorizontal: 16, marginBottom: 10 },
  searchBar: { backgroundColor: '#fff', borderRadius: 30, height: 48 },

  chipScrollOuter: { height: 52, flexShrink: 0 },
  chipScroll: { paddingHorizontal: 16, alignItems: 'center', flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
    backgroundColor: '#fff', marginRight: 8, flexShrink: 0,
  },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#374151', fontFamily: 'Inter_600SemiBold' },
  chipTextActive: { color: '#fff' },
  chipDot: { width: 7, height: 7, borderRadius: 2 },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, flexGrow: 1 },

  daySection: { marginBottom: 20 },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8, paddingHorizontal: 2,
  },
  dayLabel: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 0.5, fontFamily: 'Inter_700Bold' },
  dayTotal: { fontSize: 12, color: '#9ca3af', fontFamily: 'GeistMono_400Regular' },

  dayCard: {
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },

  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: '#fff',
  },
  txRowFirst: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  txRowLast: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  txRowSep: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },

  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3, fontFamily: 'Inter_600SemiBold' },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  txMetaText: { fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular' },
  txAmount: { fontSize: 14, fontWeight: '700', fontFamily: 'GeistMono_700Bold' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  footerText: { fontSize: 13, color: '#9ca3af', fontWeight: '500', fontFamily: 'Inter_500Medium' },

  searchSummary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    marginTop: 4, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  searchSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchSummaryLabel: { fontSize: 13, color: '#6b7280', fontFamily: 'Inter_500Medium' },
  searchSummaryValue: { fontSize: 14, fontWeight: '700', color: '#111827', fontFamily: 'Inter_700Bold' },
  searchSummarySpent: { fontSize: 16, fontWeight: '800', color: '#dc2626', fontFamily: 'GeistMono_700Bold' },
  searchSummaryDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 15, fontWeight: '500', fontFamily: 'Inter_500Medium' },
  emptyHint: { color: '#d1d5db', fontSize: 13, fontFamily: 'Inter_400Regular' },
});
