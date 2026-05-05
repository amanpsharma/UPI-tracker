import { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, IconButton, Searchbar, Menu, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@/services/api';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Category, Transaction } from '@/types';

export default function History() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');
  const [menuVisible, setMenuVisible] = useState(false);

  const load = async () => {
    const data = await api.getTransactions({
      category: filterCategory || undefined,
      limit: 100,
    });
    setTransactions(data);
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [filterCategory])
  );

  const filtered = transactions.filter(
    (tx) =>
      tx.recipient.toLowerCase().includes(search.toLowerCase()) ||
      tx.upiId.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await api.deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t._id !== id));
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.row}>
        <View style={[styles.icon, { backgroundColor: CATEGORY_COLORS[item.category] }]}>
          <MaterialCommunityIcons
            name={CATEGORY_ICONS[item.category] as any}
            size={18}
            color="#fff"
          />
        </View>
        <View style={styles.info}>
          <Text variant="titleSmall" numberOfLines={1}>
            {item.recipient}
          </Text>
          {item.upiId ? (
            <Text variant="bodySmall" style={styles.upi}>
              {item.upiId}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={styles.date}>
            {format(new Date(item.paidAt), 'dd MMM yyyy, h:mm a')}
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="titleMedium" style={styles.amount}>
            ₹{item.amount.toLocaleString('en-IN')}
          </Text>
          <Text variant="bodySmall" style={[styles.source, item.source === 'sms' ? styles.smsBadge : styles.manualBadge]}>
            {item.source}
          </Text>
        </View>
        <IconButton icon="delete-outline" size={18} onPress={() => handleDelete(item._id)} />
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text variant="headlineSmall" style={styles.heading}>
        Payment History
      </Text>
      <View style={styles.filterRow}>
        <Searchbar
          placeholder="Search recipient..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter"
              mode={filterCategory ? 'contained' : 'outlined'}
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            title="All categories"
            onPress={() => { setFilterCategory(''); setMenuVisible(false); }}
          />
          <Divider />
          {CATEGORIES.map((c) => (
            <Menu.Item
              key={c}
              title={c}
              onPress={() => { setFilterCategory(c); setMenuVisible(false); }}
            />
          ))}
        </Menu>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No transactions found.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  heading: { padding: 16, fontWeight: 'bold', color: '#6200ee' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, alignItems: 'center', gap: 4 },
  search: { flex: 1 },
  list: { padding: 12, gap: 8 },
  card: { borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  upi: { color: '#888', fontSize: 11 },
  date: { color: '#aaa', fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontWeight: 'bold' },
  source: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  smsBadge: { backgroundColor: '#d1fae5', color: '#059669' },
  manualBadge: { backgroundColor: '#e0e7ff', color: '#6200ee' },
  empty: { textAlign: 'center', color: '#999', marginTop: 48 },
});
