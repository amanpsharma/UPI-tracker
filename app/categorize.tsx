import { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { format, isToday, isYesterday } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { api } from '@/services/api';
import { CATEGORY_COLORS, CATEGORIES } from '@/constants';
import { avatarStyle, CAT_DISPLAY, CAT_SHAPE } from '@/constants/ui';
import { showToast } from '@/services/toast';
import { Category } from '@/types';

const BG = '#f5f4f0';

// Local CatIcon — slightly larger than the shared one to match this screen's design.
function CatIcon({ cat }: { cat: string }) {
  const color = CATEGORY_COLORS[cat as Category] ?? '#9ca3af';
  const shape = CAT_SHAPE[cat] ?? 'circle';
  if (shape === 'diamond') {
    return (
      <View style={styles.iconWrap}>
        <View style={[styles.iconDiamond, { backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View style={[
      styles.iconBase,
      { backgroundColor: color, borderRadius: shape === 'circle' ? 8 : 4 },
    ]} />
  );
}

export default function CategorizeScreen() {
  const params = useLocalSearchParams<{
    id: string; amount: string; recipient: string;
    paidAt: string; type: string; category: string;
  }>();

  const [selected, setSelected] = useState<Category>(
    (params.category as Category) ?? 'Other'
  );
  const [alwaysApply, setAlwaysApply] = useState(false);
  const [saving, setSaving] = useState(false);

  const av = avatarStyle(params.recipient || 'U');
  const isSent = (params.type ?? 'sent') === 'sent';
  const paidAt = params.paidAt ? new Date(params.paidAt) : new Date();
  const dateLabel = isToday(paidAt) ? 'Today' : isYesterday(paidAt) ? 'Yesterday' : format(paidAt, 'MMM d');

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateTransaction(params.id!, { category: selected });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Categorized as ${selected}`, 'success');
      router.back();
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to update category', 'error');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="close" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorize</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Transaction preview */}
        <View style={styles.txCard}>
          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
            <Text style={[styles.avatarText, { color: av.text }]}>
              {(params.recipient || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.txInfo}>
            <Text style={styles.txName} numberOfLines={1}>{params.recipient || 'Unknown'}</Text>
            <Text style={styles.txDate}>{dateLabel} · {format(paidAt, 'HH:mm')}</Text>
          </View>
          <Text style={[styles.txAmount, { color: isSent ? '#111827' : '#16a34a' }]}>
            {isSent ? '-' : '+'}₹{Number(params.amount || 0).toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>CHOOSE CATEGORY</Text>

        {/* Category list */}
        <View style={styles.catCard}>
          {CATEGORIES.map((cat, i) => {
            const isSelected = selected === cat;
            const isLast = i === CATEGORIES.length - 1;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catRow,
                  isSelected && styles.catRowSelected,
                  !isLast && styles.catRowBorder,
                ]}
                onPress={() => {
                  setSelected(cat);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.65}
              >
                <CatIcon cat={cat} />
                <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                  {CAT_DISPLAY[cat] ?? cat}
                </Text>
                {isSelected && (
                  <MaterialCommunityIcons name="check" size={18} color="#16a34a" />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Always apply rule — lives inside the card as the last row */}
          <TouchableOpacity
            style={[styles.catRow, styles.alwaysRow]}
            onPress={() => setAlwaysApply((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, alwaysApply && styles.checkboxActive]}>
              {alwaysApply && (
                <MaterialCommunityIcons name="check" size={12} color="#fff" />
              )}
            </View>
            <Text style={styles.alwaysText} numberOfLines={2}>
              {'Always categorize '}
              <Text style={styles.alwaysBold}>{params.recipient}</Text>
              {' as '}
              <Text style={styles.alwaysBold}>{CAT_DISPLAY[selected] ?? selected}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ededeb',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17, fontWeight: '700', color: '#111827', fontFamily: 'Inter_700Bold',
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },

  // Transaction card
  txCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: '#111827', fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  txDate: { fontSize: 12, color: '#9ca3af', fontFamily: 'Inter_400Regular' },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'GeistMono_700Bold' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    letterSpacing: 0.8, fontFamily: 'Inter_700Bold', paddingLeft: 2,
  },

  // Category card
  catCard: {
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 15,
  },
  catRowSelected: { backgroundColor: '#f0fdf4' },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catLabel: {
    flex: 1, fontSize: 15, fontWeight: '500', color: '#111827',
    fontFamily: 'Inter_500Medium',
  },
  catLabelSelected: { fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  // Category icons
  iconBase: { width: 16, height: 16 },
  iconWrap: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  iconDiamond: { width: 12, height: 12, borderRadius: 2, transform: [{ rotate: '45deg' }] },

  // Always apply row
  alwaysRow: {
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    alignItems: 'flex-start', paddingVertical: 14,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#d1d5db',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  alwaysText: {
    flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 20,
    fontFamily: 'Inter_400Regular',
  },
  alwaysBold: { fontWeight: '700', color: '#111827', fontFamily: 'Inter_700Bold' },

  // Footer
  footer: {
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: BG, borderTopWidth: 1, borderTopColor: '#e8e7e4',
  },
  saveBtn: {
    backgroundColor: '#111827', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
});
