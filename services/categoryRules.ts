import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '@/types';

export type CategoryRule = {
  id: string;
  keyword: string;   // stored uppercase, matched case-insensitively
  category: Category;
  createdAt: number;
};

const KEY = '@upi_tracker_category_rules';

export async function getRules(): Promise<CategoryRule[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveRules(rules: CategoryRule[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rules));
}

export async function addRule(
  keyword: string,
  category: Category,
): Promise<CategoryRule[]> {
  const rules = await getRules();
  const rule: CategoryRule = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    keyword: keyword.trim().toUpperCase(),
    category,
    createdAt: Date.now(),
  };
  // Prepend so newer rules win (checked first)
  const updated = [rule, ...rules];
  await saveRules(updated);
  return updated;
}

export async function deleteRule(id: string): Promise<CategoryRule[]> {
  const rules = await getRules();
  const updated = rules.filter((r) => r.id !== id);
  await saveRules(updated);
  return updated;
}

// Pure lookup — call with pre-loaded rules to avoid async in hot paths.
// Returns null when no rule matches (caller falls back to static map).
export function matchCustomRule(
  recipient: string,
  upiId: string,
  rules: CategoryRule[],
): Category | null {
  const text = `${recipient} ${upiId}`.toLowerCase();
  for (const rule of rules) {
    if (text.includes(rule.keyword.toLowerCase())) return rule.category;
  }
  return null;
}
