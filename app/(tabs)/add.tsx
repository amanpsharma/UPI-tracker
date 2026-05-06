import { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Snackbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { api } from '@/services/api';
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
    const trimmedRecipient = recipient.trim();
    if (!trimmedRecipient) { setSnack('Recipient name is required.'); return; }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) { setSnack('Enter a valid amount greater than 0.'); return; }

    setLoading(true);
    try {
      await api.addTransaction({
        amount: parsed,
        recipient: trimmedRecipient,
        upiId: upiId.trim(),
        note: note.trim(),
        category,
        source: 'manual',
        type: 'sent',
        transactionId: '',
        paidAt: new Date().toISOString(),
        dedupeKey: '',
      });
      router.replace('/(tabs)/');
    } catch (err: any) {
      setSnack(err.message ?? 'Failed to save. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text variant="headlineSmall" style={styles.heading}>Add Payment</Text>

          {/* Amount — prominent */}
          <View style={styles.amountBlock}>
            <TextInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              mode="outlined"
              left={<TextInput.Affix text="₹" />}
              style={styles.amountInput}
              outlineStyle={styles.amountOutline}
              contentStyle={{ fontSize: 22 }}
              autoFocus
            />
          </View>

          <Divider style={styles.divider} />

          {/* Details */}
          <Text variant="labelMedium" style={styles.sectionLabel}>PAYMENT DETAILS</Text>

          <TextInput
            label="Recipient name"
            value={recipient}
            onChangeText={setRecipient}
            mode="outlined"
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            label="UPI ID (optional)"
            value={upiId}
            onChangeText={setUpiId}
            mode="outlined"
            placeholder="name@upi"
            autoCapitalize="none"
            style={styles.input}
            returnKeyType="next"
          />
          <TextInput
            label="Note (optional)"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={styles.input}
            returnKeyType="done"
          />

          <Divider style={styles.divider} />

          <Text variant="labelMedium" style={styles.sectionLabel}>CATEGORY</Text>
          <CategoryPicker selected={category} onSelect={setCategory} />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={loading}
            disabled={loading}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {loading ? 'Saving...' : 'Save Payment'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3500}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20, gap: 10 },
  heading: { fontWeight: 'bold', color: '#6200ee', marginBottom: 4 },
  amountBlock: { marginBottom: 4 },
  amountInput: { backgroundColor: '#fff' },
  amountOutline: { borderRadius: 12 },
  divider: { marginVertical: 6 },
  sectionLabel: { color: '#aaa', marginBottom: 4, letterSpacing: 0.8 },
  input: { backgroundColor: '#fff' },
  btn: { marginTop: 12, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
});
