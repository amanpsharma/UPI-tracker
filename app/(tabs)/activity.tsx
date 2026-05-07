import { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { subDays, startOfMonth } from 'date-fns';
import { Text, Searchbar, Menu, Divider, IconButton, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Category, Transaction, TransactionType } from '@/types';
import SwipeableRow from '@/components/SwipeableRow';

const PAGE_SIZE = 50;

const AVATAR_PALETTE = [
  { bg: '#fecaca', text: '#dc2626' },
  { bg: '#fed7aa', text: '#ea580c' },
  { bg: '#fef08a', text: '#ca8a04' },
  { bg: '#bbf7d0', text: '#16a34a' },
  { bg: '#bfdbfe', text: '#2563eb' },
  { bg: '#ddd6fe', text: '#7c3aed' },
  { bg: '#fbcfe8', text: '#db2777' },
  { bg: '#cffafe', text: '#0891b2' },
];
function avatarStyle(name: string) {
  return AVATAR_PALETTE[(name || 'U').charCodeAt(0) % AVATAR_PALETTE.length];
}

export default function ActivityScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [dateRange, setDateRange] = useState<'7d' | 'month' | '90d' | ''>('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const skipRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const dateRangeOptions: { label: string; value: '7d' | 'month' | '90d' | '' }[] = [
    { label: 'All', value: '' },
    { label: '7D', value: '7d' },
    { label: 'Month', value: 'month' },
    { label: '90D', value: '90d' },
  ];

  // Debounce search → server call
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

  // Initial / filter-change load — always resets to page 1
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    skipRef.current = 0;
    loadingMoreRef.current = false;
    try {
      const data = await api.getTransactions({
        category: filterCategory || undefined,
        type: filterType || undefined,
        from: getFromDate(dateRange),
        search: debouncedSearch.trim() || undefined,
        skip: 0,
        limit: PAGE_SIZE,
      });
      setTransactions(data);
      skipRef.current = data.length;
      setHasMore(data.length === PAGE_SIZE);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterType, dateRange, debouncedSearch]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Append next page
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

  const renderItem = ({ item }: { item: Transaction }) => {
    const av = avatarStyle(item.recipient || 'U');
    const isSent = (item.type ?? 'sent') === 'sent';
    return (
      <SwipeableRow
        onDelete={() => handleDelete(item._id)}
        onPress={() => router.push({ pathname: '/transaction-detail', params: { id: item._id } })}
      >
        <View style={styles.txRow}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {(item.recipient || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txName} numberOfLines={1}>{item.recipient || 'Unknown'}</Text>
            <View style={styles.txMeta}>
              <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[item.category] }]} />
              <Text style={styles.txMetaText}>
                {item.category} · {format(new Date(item.paidAt), 'MMM d, HH:mm')}
              </Text>
            </View>
          </View>
          <Text style={[styles.txAmount, { color: isSent ? '#111827' : '#16a34a' }]}>
            {isSent ? '-' : '+'}₹{item.amount.toLocaleString('en-IN')}
          </Text>
        </View>
      </SwipeableRow>
    );
  };

  const ListFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footer}>
          <RNActivityIndicator size="small" color="#9ca3af" />
          <Text style={styles.footerText}>Loading more…</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Activity</Text>
          {!loading && (
            <Text style={styles.totalCount}>
              {transactions.length}{hasMore ? '+' : ''} transactions
            </Text>
          )}
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentStyle={{ backgroundColor: '#fff', borderRadius: 12 }}
          anchor={
            <IconButton
              icon="filter-variant"
              mode={filterCategory ? 'contained' : 'contained-tonal'}
              containerColor={filterCategory ? CATEGORY_COLORS[filterCategory] : '#f3f4f6'}
              iconColor={filterCategory ? '#fff' : '#4b5563'}
              size={22}
              style={styles.filterBtn}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item title="All categories" leadingIcon="view-grid" onPress={() => { setFilterCategory(''); setMenuVisible(false); }} />
          <Divider />
          {CATEGORIES.map((c) => (
            <Menu.Item key={c} title={c} leadingIcon={CATEGORY_ICONS[c]} onPress={() => { setFilterCategory(c); setMenuVisible(false); }} />
          ))}
        </Menu>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search name, UPI ID, note…"
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14, color: '#1f2937' }}
          placeholderTextColor="#9ca3af"
          iconColor="#6b7280"
          elevation={0}
        />
      </View>

      {/* Type + date filter chips */}
      <View style={styles.chipRow}>
        {(['', 'sent', 'received'] as const).map((t) => {
          const active = filterType === t;
          const label = t === '' ? 'All' : t === 'sent' ? '↑ Sent' : '↓ Received';
          const bg = active ? (t === 'sent' ? '#dc2626' : t === 'received' ? '#059669' : '#111827') : '#fff';
          const color = active ? '#fff' : t === 'sent' ? '#dc2626' : t === 'received' ? '#059669' : '#555';
          return (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, { backgroundColor: bg, borderColor: active ? bg : '#e5e7eb' }]}
              onPress={() => setFilterType(t)}
            >
              <Text style={[styles.typeChipText, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
        {dateRangeOptions.map(({ label, value }) => {
          const active = dateRange === value;
          return (
            <TouchableOpacity
              key={value}
              style={[styles.typeChip, { backgroundColor: active ? '#111827' : '#fff', borderColor: active ? '#111827' : '#e5e7eb' }]}
              onPress={() => setDateRange(value)}
            >
              <Text style={[styles.typeChipText, { color: active ? '#fff' : '#555' }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active category chip */}
      {filterCategory ? (
        <View style={styles.activeCatRow}>
          <Chip
            icon={() => <MaterialCommunityIcons name={CATEGORY_ICONS[filterCategory] as any} size={14} color="#fff" />}
            style={[styles.activeCatChip, { backgroundColor: CATEGORY_COLORS[filterCategory] }]}
            textStyle={{ color: '#fff', fontSize: 13, fontWeight: '600' }}
            onClose={() => setFilterCategory('')}
            closeIcon={() => <MaterialCommunityIcons name="close-circle" size={16} color="#fff" />}
          >
            {filterCategory}
          </Chip>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#111827" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111827" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={<ListFooter />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name={error ? 'wifi-off' : 'receipt-text-outline'} size={40} color="#e5e7eb" />
              <Text style={[styles.emptyText, error ? { color: '#ef4444' } : null]}>
                {error || (search || filterCategory ? 'No results found.' : 'No transactions yet.')}
              </Text>
              {!error && !search && !filterCategory && (
                <Text style={styles.emptyHint}>Sync from SMS or add manually.</Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  totalCount: { fontSize: 12, color: '#9ca3af', fontWeight: '500', marginTop: 2 },
  filterBtn: { margin: 0, borderRadius: 12 },

  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchBar: { backgroundColor: '#fff', borderRadius: 12, height: 46 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  typeChipText: { fontSize: 12, fontWeight: '600' },

  activeCatRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 6 },
  activeCatChip: { elevation: 0 },

  list: { padding: 16, paddingTop: 4, flexGrow: 1 },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 3 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catDot: { width: 7, height: 7, borderRadius: 2 },
  txMetaText: { fontSize: 12, color: '#9ca3af' },
  txAmount: { fontSize: 14, fontWeight: '700' },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 20 },
  footerText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: '#9ca3af', fontSize: 15, fontWeight: '500' },
  emptyHint: { color: '#d1d5db', fontSize: 13 },
});
