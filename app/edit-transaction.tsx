import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { CATEGORIES } from '@/constants';
import { CAT_DISPLAY } from '@/constants/ui';
import CatIcon from '@/components/CatIcon';
import { showToast } from '@/services/toast';
import { Category } from '@/types';
import { colors, fonts, radius } from '@/constants/theme';

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak'];

export default function EditTransaction() {
  const params = useLocalSearchParams<{
    id: string;
    amount: string;
    recipient: string;
    note: string;
    upiId: string;
    bank: string;
    category: string;
    type: string;
    paidAt: string;
  }>();

  const [txType, setTxType] = useState<'sent' | 'received'>(
    (params.type as 'sent' | 'received') ?? 'sent',
  );
  const [amount, setAmount] = useState(params.amount ?? '');
  const [recipient, setRecipient] = useState(params.recipient ?? '');
  const [upiId, setUpiId] = useState(params.upiId ?? '');
  const [category, setCategory] = useState<Category>((params.category as Category) ?? 'Other');
  const [bank, setBank] = useState(params.bank?.trim() || 'HDFC');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState('');

  useEffect(() => {
    if (params.amount) setAmount(params.amount);
    if (params.recipient) setRecipient(params.recipient);
    if (params.upiId) setUpiId(params.upiId);
    if (params.bank) setBank(params.bank.trim());
    if (params.category) setCategory(params.category as Category);
    if (params.type) setTxType(params.type as 'sent' | 'received');
  }, [params.id]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !!amount.trim() && !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10_000_000;
  const isValid = isValidAmount && !!recipient.trim();

  const txDate = params.paidAt ? new Date(params.paidAt) : new Date();
  const dateLabel = isToday(txDate)
    ? 'Today'
    : isYesterday(txDate)
      ? 'Yesterday'
      : format(txDate, 'MMM d');
  const timeLabel = format(txDate, 'HH:mm');

  const handleSave = async () => {
    if (!recipient.trim()) {
      setSnack('Recipient name is required.');
      return;
    }
    if (!isValidAmount) {
      setSnack('Enter a valid amount (1 - 1,00,00,000).');
      return;
    }
    const parsed = parsedAmount;
    setSaving(true);
    try {
      await api.updateTransaction(params.id!, {
        amount: parsed,
        recipient: recipient.trim(),
        upiId: upiId.trim(),
        bank: bank,
        type: txType,
        note: params.note ?? '',
        category,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Transaction updated', 'success');
      router.back();
    } catch (err: any) {
      setSnack(err.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTransaction(params.id!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Transaction deleted', 'success');
            router.replace('/(tabs)/activity');
          } catch {
            setSnack('Failed to delete.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit transaction</Text>
          <TouchableOpacity
            onPress={handleDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Expense / Income toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleOption, txType === 'sent' && styles.toggleActive]}
              onPress={() => setTxType('sent')}
            >
              <Text style={[styles.toggleText, txType === 'sent' && styles.toggleTextActive]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleOption, txType === 'received' && styles.toggleActiveIncome]}
              onPress={() => setTxType('received')}
            >
              <Text style={[styles.toggleText, txType === 'received' && styles.toggleTextActive]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount */}
          <View style={styles.amountSection}>
            <Text style={styles.fieldLabel}>AMOUNT</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>{txType === 'sent' ? '-' : '+'}₹</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
          </View>

          {/* Merchant / Payee */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>MERCHANT / PAYEE</Text>
            <TextInput
              style={styles.textInput}
              value={recipient}
              onChangeText={setRecipient}
              placeholder="Enter merchant name"
              placeholderTextColor={colors.textPlaceholder}
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>CATEGORY</Text>
            <TouchableOpacity
              style={[styles.selectRow, showCatPicker && styles.selectRowOpen]}
              onPress={() => setShowCatPicker((v) => !v)}
              activeOpacity={0.7}
            >
              <CatIcon cat={category} />
              <Text style={styles.selectText}>{CAT_DISPLAY[category] ?? category}</Text>
              <MaterialCommunityIcons
                name={showCatPicker ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </TouchableOpacity>
            {showCatPicker && (
              <View style={styles.catDropdown}>
                {CATEGORIES.map((cat, i) => {
                  const isSelected = cat === category;
                  const isLast = i === CATEGORIES.length - 1;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catOption,
                        isSelected && styles.catOptionSelected,
                        !isLast && styles.catOptionBorder,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCatPicker(false);
                        Haptics.selectionAsync();
                      }}
                      activeOpacity={0.7}
                    >
                      <CatIcon cat={cat} />
                      <Text
                        style={[styles.catOptionText, isSelected && styles.catOptionTextActive]}
                      >
                        {CAT_DISPLAY[cat] ?? cat}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check" size={16} color={colors.success} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Date + Time (read-only) */}
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <View style={styles.selectRow}>
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.selectText}>{dateLabel}</Text>
              </View>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>TIME</Text>
              <View style={styles.selectRow}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.selectText}>{timeLabel}</Text>
              </View>
            </View>
          </View>

          {/* UPI ID */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>UPI ID (VPA)</Text>
            <TextInput
              style={styles.textInput}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="merchant@bank"
              placeholderTextColor={colors.textPlaceholder}
              autoCapitalize="none"
            />
          </View>

          {/* Bank */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>BANK</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.banksRow}
            >
              {Array.from(new Set([bank, ...BANKS]))
                .filter(Boolean)
                .map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankChip, bank === b && styles.bankChipActive]}
                    onPress={() => setBank(b)}
                  >
                    <Text style={[styles.bankText, bank === b && styles.bankTextActive]}>{b}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, (!isValid || saving) && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3500}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const BOX = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  paddingHorizontal: 14,
  paddingVertical: 13,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fonts.bold,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 12, gap: 16 },

  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  toggleActive: {
    backgroundColor: colors.dangerSoft,
  },
  toggleActiveIncome: {
    backgroundColor: colors.successSoft,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    fontFamily: fonts.semibold,
  },
  toggleTextActive: { color: colors.text },

  amountSection: { alignItems: 'center', paddingVertical: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  amountPrefix: {
    fontSize: 26,
    color: colors.textMuted,
    fontWeight: '500',
    fontFamily: fonts.medium,
    marginRight: 4,
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.monoBold,
    padding: 0,
    minWidth: 60,
  },

  field: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.7,
    fontFamily: fonts.bold,
  },

  textInput: {
    ...BOX,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.regular,
  },

  selectRow: {
    ...BOX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectRowOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  selectText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.regular,
  },

  catDropdown: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  catOptionSelected: { backgroundColor: colors.primarySoft },
  catOptionBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  catOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontFamily: fonts.regular,
  },
  catOptionTextActive: { fontWeight: '600', fontFamily: fonts.semibold },

  rowFields: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1, gap: 6 },

  banksRow: { flexDirection: 'row', gap: 8 },
  bankChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bankChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  bankText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
  bankTextActive: { color: '#fff' },

  bottomRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },
  primaryBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryBtnDisabled: { backgroundColor: colors.textDisabled },
  primaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    fontFamily: fonts.semibold,
  },
});
