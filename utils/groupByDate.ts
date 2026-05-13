import { format } from 'date-fns';
import { subDays } from 'date-fns';
import { Transaction } from '@/types';

export type DayGroup = {
  date: string;
  label: string;
  sentTotal: number;
  receivedTotal: number;
  transactions: Transaction[];
};

export function groupTransactionsByDate(transactions: Transaction[]): DayGroup[] {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const map: Record<string, DayGroup> = {};
  const order: string[] = [];

  for (const tx of transactions) {
    const date = format(new Date(tx.paidAt), 'yyyy-MM-dd');
    if (!map[date]) {
      const label =
        date === today
          ? 'TODAY'
          : date === yesterday
            ? 'YESTERDAY'
            : format(new Date(tx.paidAt), 'MMM d, yyyy');
      map[date] = { date, label, sentTotal: 0, receivedTotal: 0, transactions: [] };
      order.push(date);
    }
    map[date].transactions.push(tx);
    const type = tx.type ?? 'sent';
    if (type === 'sent') map[date].sentTotal += tx.amount;
    else map[date].receivedTotal += tx.amount;
  }

  return order.map((d) => map[d]);
}
