import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getBudgets } from './budgetStorage';
import { api } from './api';
import { Category } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkBudgetAlerts(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const [stats, budgets] = await Promise.all([api.getStats(), getBudgets()]);

    const spendMap: Partial<Record<Category, number>> = {};
    stats.byCategory.forEach((c) => { spendMap[c._id] = c.total; });

    for (const cat of Object.keys(budgets) as Category[]) {
      const budget = budgets[cat];
      if (!budget || budget <= 0) continue;

      const spent = spendMap[cat] ?? 0;
      const pct = (spent / budget) * 100;

      if (pct >= 100) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔴 ${cat} budget exceeded`,
            body: `You've spent ₹${spent.toLocaleString('en-IN')} of your ₹${budget.toLocaleString('en-IN')} limit.`,
            data: { category: cat },
          },
          trigger: null,
        });
      } else if (pct >= 80) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ ${cat} at ${Math.round(pct)}%`,
            body: `₹${(budget - spent).toLocaleString('en-IN')} remaining of your ₹${budget.toLocaleString('en-IN')} budget.`,
            data: { category: cat },
          },
          trigger: null,
        });
      }
    }
  } catch {
    // silently ignore — notifications are non-critical
  }
}
