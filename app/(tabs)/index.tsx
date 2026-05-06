import { useEffect, useRef, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, AppState, AppStateStatus, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Surface, Chip, Searchbar } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Stats, Transaction, TransactionType } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SmsSyncButton from '@/components/SmsSyncButton';
import { syncSmsToMongo } from '@/services/smsSyncAndroid';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.username ?? user?.emailAddresses[0]?.emailAddress?.split('@')[0] ?? '';
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [search, setSearch] = useState('');
  const appState = useRef<AppStateStatus>('active');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        syncSmsToMongo().then(({ imported }) => { if (imported > 0) load(); }).catch(() => {});
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, txs] = await Promise.all([
        api.getStats(),
        api.getTransactions({ limit: 5, type: typeFilter === 'all' ? undefined : typeFilter }),
      ]);
      setStats(s);
      setRecent(txs);
    } catch {
      // silently ignore — user sees empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <LottieView
          source={require('@/assets/animations/loading.json')}
          autoPlay
          loop
          style={{ width: 120, height: 120 }}
        />
      </SafeAreaView>
    );
  }

  const monthLabel = format(new Date(), 'MMMM yyyy');
  const q = search.toLowerCase();
  const filteredRecent = q
    ? recent.filter(
        (tx) =>
          tx.recipient.toLowerCase().includes(q) ||
          tx.upiId.toLowerCase().includes(q) ||
          (tx.note ?? '').toLowerCase().includes(q)
      )
    : recent;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6200ee" />}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text variant="bodyMedium" style={styles.greetingText}>{greeting()}{displayName ? `, ${displayName}` : ''}</Text>
            <Text variant="headlineMedium" style={styles.heading}>UPI Tracker</Text>
          </View>
          <View style={styles.headerRight}>
            <Text variant="bodySmall" style={styles.dateText}>{format(new Date(), 'EEE, d MMM')}</Text>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={() => signOut()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="logout" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month summary card */}
        <Surface style={styles.summaryCard} elevation={3}>
          <Text style={styles.cardLabel}>{monthLabel}</Text>
          <Text style={styles.cardAmount}>
            ₹{(stats?.thisMonth.total ?? 0).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.cardSub}>
            {stats?.thisMonth.count ?? 0} payment{stats?.thisMonth.count !== 1 ? 's' : ''} this month
          </Text>
          {(stats?.allTime.total ?? 0) > 0 && (
            <View style={styles.allTimePill}>
              <Text style={styles.allTimeText}>
                All time: ₹{(stats?.allTime.total ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}
        </Surface>

        <SmsSyncButton onDone={load} />

        {/* Category chips */}
        {stats && stats.byCategory.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>This month by category</Text>
            <View style={styles.chips}>
              {stats.byCategory.map((c) => (
                <Chip
                  key={c._id}
                  icon={() => (
                    <MaterialCommunityIcons name={CATEGORY_ICONS[c._id] as any} size={13} color="#fff" />
                  )}
                  style={[styles.chip, { backgroundColor: CATEGORY_COLORS[c._id] }]}
                  textStyle={{ color: '#fff', fontSize: 12 }}
                >
                  {c._id} · ₹{c.total.toLocaleString('en-IN')}
                </Chip>
              ))}
            </View>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text variant="titleSmall" style={styles.sectionTitle}>Recent payments</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>

          <Searchbar
            placeholder="Search payments..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchBar}
            inputStyle={{ fontSize: 13 }}
            elevation={0}
          />

          {/* Type filter chips */}
          <View style={styles.typeFilterRow}>
            {(['all', 'sent', 'received'] as const).map((t) => {
              const active = typeFilter === t;
              const bg = active ? (t === 'sent' ? '#dc2626' : t === 'received' ? '#059669' : '#6200ee') : '#fff';
              const textColor = active ? '#fff' : t === 'sent' ? '#dc2626' : t === 'received' ? '#059669' : '#555';
              const iconColor = active ? '#fff' : t === 'sent' ? '#dc2626' : '#059669';
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, { backgroundColor: bg, borderColor: active ? bg : '#e5e7eb' }]}
                  onPress={() => setTypeFilter(t)}
                >
                  {t !== 'all' && (
                    <MaterialCommunityIcons
                      name={t === 'sent' ? 'arrow-up' : 'arrow-down'}
                      size={12}
                      color={iconColor}
                    />
                  )}
                  <Text style={[styles.typeChipText, { color: textColor }]}>
                    {t === 'all' ? 'All' : t === 'sent' ? 'Sent' : 'Received'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {filteredRecent.length === 0 ? (
            <View style={styles.emptyBox}>
              <LottieView
                source={require('@/assets/animations/empty.json')}
                autoPlay
                loop
                style={{ width: 160, height: 160 }}
              />
              <Text style={styles.emptyText}>No payments yet.</Text>
              <Text style={styles.emptyHint}>Add one manually or sync from SMS above.</Text>
            </View>
          ) : (
            filteredRecent.map((tx) => (
              <TouchableOpacity
                key={tx._id}
                activeOpacity={0.75}
                onPress={() => router.push({
                  pathname: '/transaction-detail',
                  params: { id: tx._id },
                })}
              >
                <Card style={styles.txCard}>
                  <Card.Content style={styles.txRow}>
                    <View style={[styles.iconBox, { backgroundColor: CATEGORY_COLORS[tx.category] }]}>
                      <MaterialCommunityIcons name={CATEGORY_ICONS[tx.category] as any} size={18} color="#fff" />
                    </View>
                    <View style={styles.txInfo}>
                      <Text variant="titleSmall" numberOfLines={1}>{tx.recipient}</Text>
                      <Text style={styles.txDate}>{format(new Date(tx.paidAt), 'dd MMM, h:mm a')}</Text>
                    </View>
                    <View style={styles.txRight}>
                      <Text variant="titleMedium" style={styles.txAmount}>
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </Text>
                      {(() => {
                        const isSent = (tx.type ?? 'sent') === 'sent';
                        return (
                          <View style={[styles.txTypePill, { backgroundColor: isSent ? '#fee2e2' : '#d1fae5' }]}>
                            <MaterialCommunityIcons
                              name={isSent ? 'arrow-up' : 'arrow-down'}
                              size={10}
                              color={isSent ? '#dc2626' : '#059669'}
                            />
                            <Text style={[styles.txTypePillText, { color: isSent ? '#dc2626' : '#059669' }]}>
                              {isSent ? 'Sent' : 'Received'}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 14 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  greetingText: { color: '#888', marginBottom: 2 },
  heading: { fontWeight: 'bold', color: '#6200ee' },
  headerRight: { alignItems: 'flex-end', gap: 4 },
  dateText: { color: '#aaa' },
  signOutBtn: { padding: 4 },

  summaryCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    alignItems: 'center',
    gap: 2,
  },
  cardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  cardAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 4, letterSpacing: -1 },
  cardSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  allTimePill: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  allTimeText: { color: 'rgba(255,255,255,0.9)', fontSize: 12 },

  section: { gap: 8 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontWeight: '600', color: '#333' },
  viewAll: { color: '#6200ee', fontSize: 13, fontWeight: '500' },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 2 },

  searchBar: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 4 },
  typeFilterRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  typeChipText: { fontSize: 12, fontWeight: '600' },

  txCard: { borderRadius: 12, backgroundColor: '#fff' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txDate: { color: '#aaa', fontSize: 11, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontWeight: 'bold', color: '#222' },
  txTypePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10,
  },
  txTypePillText: { fontSize: 10, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  emptyText: { color: '#bbb', fontSize: 15, fontWeight: '500' },
  emptyHint: { color: '#ccc', fontSize: 12, textAlign: 'center' },
});
