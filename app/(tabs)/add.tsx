import { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api } from '@/services/api';
import { CATEGORIES } from '@/constants';
import { CAT_DISPLAY } from '@/constants/ui';
import CatIcon from '@/components/CatIcon';
import { Category } from '@/types';
import { colors, fonts, radius } from '@/constants/theme';

const BANKS = ['HDFC', 'ICICI', 'SBI', 'Axis', 'Kotak'];

export default function AddTransaction() {
  const [txType, setTxType] = useState<'sent' | 'received'>('sent');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [upiId, setUpiId] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [date, setDate] = useState(new Date());
  const [bank, setBank] = useState('HDFC');
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState('');

  const parsedAmount = parseFloat(amount);
  const isValidAmount =
    !!amount.trim() && !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= 10_000_000;
  const isValid = isValidAmount && !!recipient.trim();

  const dateLabel = isToday(date)
    ? 'Today'
    : isYesterday(date)
      ? 'Yesterday'
      : format(date, 'MMM d');
  const timeLabel = format(date, 'HH:mm');

  const handleSave = async () => {
    if (!recipient.trim()) {
      setSnack('Recipient name is required.');
      return;
    }
    if (!isValidAmount) {
      setSnack('Enter a valid amount (1 – 1,00,00,000).');
      return;
    }
    const parsed = parsedAmount;
    setLoading(true);
    try {
      await api.addTransaction({
        amount: parsed,
        recipient: recipient.trim(),
        upiId: upiId.trim(),
        bank: bank,
        note: '',
        category,
        source: 'manual',
        type: txType,
        transactionId: '',
        paidAt: date.toISOString(),
        dedupeKey: '',
      });
      router.replace('/(tabs)/');
    } catch (err: any) {
      setSnack(err.message ?? 'Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, picked?: Date) => {
    setShowDatePicker(false);
    if (picked) {
      const next = new Date(picked);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setDate(next);
    }
  };

  const onTimeChange = (_event: DateTimePickerEvent, picked?: Date) => {
    setShowTimePicker(false);
    if (picked) {
      const next = new Date(date);
      next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      setDate(next);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <Text style={styles.headerTitle}>Add transaction</Text>
          <View style={{ width: 36 }} />
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
                style={[styles.amountInput, !amount && styles.amountPlaceholder]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                autoFocus
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

          {/* Date + Time */}
          <View style={styles.rowFields}>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>DATE</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="calendar-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.selectText}>{dateLabel}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.rowField}>
              <Text style={styles.fieldLabel}>TIME</Text>
              <TouchableOpacity
                style={styles.selectRow}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.selectText}>{timeLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

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
              {BANKS.map((b) => (
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
            style={[styles.primaryBtn, (!isValid || loading) && styles.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{loading ? 'Saving...' : 'Add transaction'}</Text>
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

  amountSection: { alignItems: 'center', paddingVertical: 8 },
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
  amountPlaceholder: { color: colors.textDisabled },

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
