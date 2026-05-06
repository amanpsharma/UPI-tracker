import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { Transaction } from '@/types';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getTransaction(id)
      .then(setTx)
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Transaction',
      `Remove ₹${tx?.amount.toLocaleString('en-IN')} paid to ${tx?.recipient}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteTransaction(id!);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    if (!tx) return;
    router.push({
      pathname: '/edit-transaction',
      params: {
        id: tx._id,
        amount: String(tx.amount),
        recipient: tx.recipient,
        note: tx.note ?? '',
        category: tx.category,
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#6200ee" />
      </SafeAreaView>
    );
  }

  if (!tx) return null;

  const isSent = (tx.type ?? 'sent') === 'sent';
  const catColor = CATEGORY_COLORS[tx.category];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Detail</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${catColor}30` }]}>
          <MaterialCommunityIcons name={CATEGORY_ICONS[tx.category] as any} size={36} color={catColor} />
        </View>
        <Text style={styles.heroRecipient}>{tx.recipient}</Text>
        <Text style={styles.heroAmount}>
          {isSent ? '− ' : '+ '}₹{tx.amount.toLocaleString('en-IN')}
        </Text>
        <View style={[styles.typeBadge, { backgroundColor: isSent ? '#fee2e2' : '#d1fae5' }]}>
          <MaterialCommunityIcons
            name={isSent ? 'arrow-up-circle' : 'arrow-down-circle'}
            size={14}
            color={isSent ? '#dc2626' : '#059669'}
          />
          <Text style={[styles.typeBadgeText, { color: isSent ? '#dc2626' : '#059669' }]}>
            {isSent ? 'Sent' : 'Received'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Details card */}
        <View style={styles.card}>
          <Row icon="calendar" label="Date" value={format(new Date(tx.paidAt), 'dd MMM yyyy, hh:mm a')} />
          <Divider />
          <Row icon="tag-outline" label="Category" value={tx.category} valueColor={catColor} />
          <Divider />
          {tx.upiId ? (
            <>
              <Row icon="at" label="UPI ID" value={tx.upiId} mono />
              <Divider />
            </>
          ) : null}
          {tx.note ? (
            <>
              <Row icon="text" label="Note" value={tx.note} />
              <Divider />
            </>
          ) : null}
          <Row
            icon={tx.source === 'sms' ? 'message-processing-outline' : 'hand-pointing-up'}
            label="Source"
            value={tx.source === 'sms' ? 'Auto (SMS)' : 'Manual'}
          />
          {tx.transactionId ? (
            <>
              <Divider />
              <Row icon="identifier" label="Ref / Txn ID" value={tx.transactionId} mono />
            </>
          ) : null}
          <Divider />
          <Row icon="clock-outline" label="Added on" value={format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')} />
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.85}>
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Edit Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
          <Text style={styles.deleteBtnText}>{deleting ? 'Deleting…' : 'Delete Transaction'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
  valueColor,
  mono,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <MaterialCommunityIcons name={icon as any} size={16} color="#aaa" />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.rowValue, valueColor ? { color: valueColor, fontWeight: '700' } : null, mono ? styles.mono : null]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6200ee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },

  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 32,
    gap: 8,
  },
  heroIcon: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  heroRecipient: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center', paddingHorizontal: 24 },
  heroAmount: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { color: '#888', fontSize: 14 },
  rowValue: { color: '#1a1a1a', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  mono: { fontFamily: 'monospace', fontSize: 12, color: '#555' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#6200ee',
    borderRadius: 14, paddingVertical: 15,
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
