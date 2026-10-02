import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS } from '@/constants';
import { CAT_DISPLAY } from '@/constants/ui';
import { Category } from '@/types';
import { CategoryRule, getRules, addRule, deleteRule } from '@/services/categoryRules';
import { colors, fonts, radius } from '@/constants/theme';

// ─── Rule row ────────────────────────────────────────────────────────────────
function RuleRow({
  rule,
  isLast,
  onDelete,
}: {
  rule: CategoryRule;
  isLast: boolean;
  onDelete: () => void;
}) {
  const color = CATEGORY_COLORS[rule.category] ?? '#A0A0A0';
  const label = CAT_DISPLAY[rule.category] ?? rule.category;

  return (
    <View style={[styles.ruleRow, !isLast && styles.ruleRowBorder]}>
      {/* Keyword chip */}
      <View style={styles.keywordChip}>
        <Text style={styles.keywordText}>{rule.keyword}</Text>
      </View>

      {/* Arrow */}
      <MaterialCommunityIcons
        name="arrow-right"
        size={14}
        color={colors.textMuted}
        style={styles.arrow}
      />

      {/* Category badge */}
      <View style={[styles.catBadge, { backgroundColor: color + '18' }]}>
        <View style={[styles.catDot, { backgroundColor: color }]} />
        <Text style={[styles.catBadgeText, { color }]}>{label}</Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="close" size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Add-rule bottom sheet ───────────────────────────────────────────────────
function AddRuleSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (keyword: string, category: Category) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<Category>('Food');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      setKeyword('');
      setSelected('Food');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!keyword.trim()) return;
    setSaving(true);
    try {
      await onSave(keyword, selected);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <Text style={styles.sheetTitle}>New rule</Text>
          <Text style={styles.sheetSubtitle}>
            Keyword is matched against the merchant name and UPI ID.
          </Text>

          {/* Keyword input */}
          <Text style={styles.inputLabel}>MERCHANT KEYWORD</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={keyword}
            onChangeText={(t) => setKeyword(t.toUpperCase())}
            placeholder="e.g. SWIGGY"
            placeholderTextColor={colors.textPlaceholder}
            autoCapitalize="characters"
            returnKeyType="done"
          />

          {/* Category picker */}
          <Text style={[styles.inputLabel, { marginTop: 20 }]}>CATEGORY</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => {
              const active = cat === selected;
              const color = CATEGORY_COLORS[cat];
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setSelected(cat)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={CATEGORY_ICONS[cat] as any}
                    size={13}
                    color={active ? '#fff' : color}
                  />
                  <Text style={[styles.catChipText, active && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveBtn, (!keyword.trim() || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!keyword.trim() || saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save rule'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function CategoryRulesScreen() {
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    getRules().then(setRules);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await deleteRule(id);
    setRules(updated);
  }, []);

  const handleSave = useCallback(async (keyword: string, category: Category) => {
    const updated = await addRule(keyword, category);
    setRules(updated);
    setShowSheet(false);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/settings'))}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Category rules</Text>
      </View>

      <Text style={styles.subtitle}>
        When a merchant name matches, auto-assign a category. Newer rules win.
      </Text>

      {/* Rules list */}
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons name="filter-variant" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No custom rules yet</Text>
            <Text style={styles.emptyHint}>Rules override the built-in merchant map</Text>
          </View>
        }
        ListHeaderComponent={
          rules.length > 0 ? (
            <View style={styles.rulesCard}>
              {rules.map((rule, idx) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  isLast={idx === rules.length - 1}
                  onDelete={() => handleDelete(rule.id)}
                />
              ))}
            </View>
          ) : null
        }
        // FlatList data is empty when rules exist (header carries the card)
        renderItem={() => null}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowSheet(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="plus" size={16} color={colors.textSecondary} />
            <Text style={styles.addBtnText}>Add rule</Text>
          </TouchableOpacity>
        }
      />

      <AddRuleSheet visible={showSheet} onClose={() => setShowSheet(false)} onSave={handleSave} />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.extrabold,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 16,
    lineHeight: 19,
    fontFamily: fonts.regular,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  // Rules card
  rulesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  ruleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  keywordChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    fontFamily: 'GeistMono_700Bold',
    letterSpacing: 0.4,
  },

  arrow: { marginHorizontal: 2 },

  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flex: 1,
  },
  catDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  catBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fonts.semibold,
  },

  deleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: fonts.semibold,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: fonts.regular,
  },

  // Bottom sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.extrabold,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    marginBottom: 20,
    lineHeight: 18,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    fontFamily: fonts.bold,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontFamily: 'GeistMono_700Bold',
    letterSpacing: 0.5,
  },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
  },

  saveBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fonts.bold,
  },
});
