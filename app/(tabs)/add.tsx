import { useState } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  SegmentedButtons,
  Snackbar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/services/api';
import { CATEGORIES } from '@/constants';
import { Category } from '@/types';
import CategoryPicker from '@/components/CategoryPicker';

export default function AddTransaction() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [upiId, setUpiId] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');

  const handleSave = async () => {
    if (!amount || !recipient) {
      setSnack('Amount and recipient are required.');
      return;
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setSnack('Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      await api.addTransaction({
        amount: parsed,
        recipient: recipient.trim(),
        upiId: upiId.trim(),
        note: note.trim(),
        category,
        source: 'manual',
        transactionId: '',
        paidAt: new Date().toISOString(),
      });
      router.replace('/(tabs)/');
    } catch {
      setSnack('Failed to save. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.heading}>
          Add Payment
        </Text>

        <TextInput
          label="Amount (₹)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          mode="outlined"
          left={<TextInput.Affix text="₹" />}
          style={styles.input}
        />

        <TextInput
          label="Recipient name"
          value={recipient}
          onChangeText={setRecipient}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="UPI ID (optional)"
          value={upiId}
          onChangeText={setUpiId}
          mode="outlined"
          placeholder="name@upi"
          autoCapitalize="none"
          style={styles.input}
        />

        <TextInput
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          mode="outlined"
          style={styles.input}
        />

        <Text variant="labelLarge" style={styles.label}>
          Category
        </Text>
        <CategoryPicker selected={category} onSelect={setCategory} />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={loading}
          disabled={loading}
          style={styles.btn}
          contentStyle={{ paddingVertical: 6 }}
        >
          Save Payment
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack('')}
        duration={3000}
      >
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, gap: 12 },
  heading: { fontWeight: 'bold', color: '#6200ee', marginBottom: 8 },
  input: { backgroundColor: '#fff' },
  label: { marginTop: 4 },
  btn: { marginTop: 12, borderRadius: 8 },
});
