import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '@/types';

export type Budgets = Record<Category, number>;

const KEY = '@upi_tracker_budgets';

const DEFAULT: Budgets = {
  Food: 0, Transport: 0, Shopping: 0,
  Bills: 0, Entertainment: 0, Health: 0, Other: 0,
};

export async function getBudgets(): Promise<Budgets> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveBudgets(budgets: Budgets): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
}
