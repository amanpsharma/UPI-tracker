import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, Surface, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Stats, Transaction } from '@/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SmsSyncButton from '@/components/SmsSyncButton';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, txs] = await Promise.all([api.getStats(), api.getTransactions({ limit: 5 })]);
      setStats(s);
      setRecent(txs);
    } catch {
      // silently ignore — user will see empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#6200ee" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >
        <Text variant="headlineMedium" style={styles.heading}>
          UPI Tracker
        </Text>

        {/* Month summary */}
        <Surface style={styles.summaryCard} elevation={2}>
          <Text variant="labelLarge" style={styles.label}>
            Spent this month
          </Text>
          <Text variant="displaySmall" style={styles.amount}>
            ₹{(stats?.thisMonth.total ?? 0).toLocaleString('en-IN')}
          </Text>
          <Text variant="bodySmall" style={styles.sub}>
            {stats?.thisMonth.count ?? 0} transactions
          </Text>
        </Surface>

        <SmsSyncButton onDone={load} />

        {/* Category breakdown */}
        {stats && stats.byCategory.length > 0 && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              By category
            </Text>
            <View style={styles.chips}>
              {stats.byCategory.map((c) => (
                <Chip
                  key={c._id}
                  icon={() => (
                    <MaterialCommunityIcons
                      name={CATEGORY_ICONS[c._id] as any}
                      size={14}
                      color="#fff"
                    />
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
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Recent payments
          </Text>
          {recent.length === 0 ? (
            <Text style={styles.empty}>No payments yet. Add one or sync from SMS.</Text>
          ) : (
            recent.map((tx) => (
              <Card key={tx._id} style={styles.txCard}>
                <Card.Content style={styles.txRow}>
                  <View style={[styles.iconBox, { backgroundColor: CATEGORY_COLORS[tx.category] }]}>
                    <MaterialCommunityIcons
                      name={CATEGORY_ICONS[tx.category] as any}
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text variant="titleSmall">{tx.recipient}</Text>
                    <Text variant="bodySmall" style={styles.sub}>
                      {format(new Date(tx.paidAt), 'dd MMM, h:mm a')}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={styles.txAmount}>
                    ₹{tx.amount.toLocaleString('en-IN')}
                  </Text>
                </Card.Content>
              </Card>
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
  scroll: { padding: 16, gap: 12 },
  heading: { fontWeight: 'bold', color: '#6200ee', marginBottom: 4 },
  summaryCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#6200ee',
    alignItems: 'center',
  },
  label: { color: 'rgba(255,255,255,0.8)' },
  amount: { color: '#fff', fontWeight: 'bold', marginVertical: 4 },
  sub: { color: 'rgba(255,255,255,0.7)' },
  section: { marginTop: 8 },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  txCard: { marginBottom: 8, borderRadius: 12 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1 },
  txAmount: { fontWeight: 'bold', color: '#333' },
  empty: { color: '#999', textAlign: 'center', marginTop: 24 },
});
