import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Text, TextInput, Button, Snackbar, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { api } from '@/services/api';
import CategoryPicker from '@/components/CategoryPicker';
import { Category } from '@/types';

export default function EditTransaction() {
  const params = useLocalSearchParams<{
    id: string;
    amount: string;
    recipient: string;
    note: string;
    category: string;
  }>();

  const [amount, setAmount] = useState(params.amount ?? '');
  const [recipient, setRecipient] = useState(params.recipient ?? '');
  const [note, setNote] = useState(params.note ?? '');
  const [category, setCategory] = useState<Category>((params.category as Category) ?? 'Other');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  // Sync initial values once params are available (Expo Router may deliver them async)
  useEffect(() => {
    if (params.amount) setAmount(params.amount);
    if (params.recipient) setRecipient(params.recipient);
    if (params.note !== undefined) setNote(params.note);
    if (params.category) setCategory(params.category as Category);
  }, [params.id]);

  const handleSave = async () => {
    const parsed = parseFloat(amount);
    if (!recipient.trim() || isNaN(parsed) || parsed <= 0) {
      setSnack('Amount and recipient are required.');
      return;
    }
    setSaving(true);
    try {
      await api.updateTransaction(params.id!, {
        amount: parsed,
        recipient: recipient.trim(),
        note: note.trim(),
        category,
      });
      router.back();
    } catch (err: any) {
      setSnack(err.message ?? 'Failed to save. Try again.');
    } finally {
      setSaving(false);
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
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>Edit Payment</Text>
            <Button onPress={() => router.back()} compact textColor="#888">Cancel</Button>
          </View>

          <TextInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            mode="outlined"
            left={<TextInput.Affix text="₹" />}
            style={styles.input}
            contentStyle={{ fontSize: 20 }}
          />

          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={styles.sectionLabel}>PAYMENT DETAILS</Text>

          <TextInput
            label="Recipient"
            value={recipient}
            onChangeText={setRecipient}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Note"
            value={note}
            onChangeText={setNote}
            mode="outlined"
            style={styles.input}
          />

          <Divider style={styles.divider} />
          <Text variant="labelMedium" style={styles.sectionLabel}>CATEGORY</Text>
          <CategoryPicker selected={category} onSelect={setCategory} />

          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
          >
            {saving ? 'Saving...' : 'Save Changes'}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontWeight: 'bold', color: '#6200ee' },
  input: { backgroundColor: '#fff' },
  divider: { marginVertical: 6 },
  sectionLabel: { color: '#aaa', letterSpacing: 0.8, marginBottom: 4 },
  btn: { marginTop: 12, borderRadius: 10 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '600' },
});
