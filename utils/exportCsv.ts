import { format } from 'date-fns';
import { Transaction } from '@/types';

export type ExportDateRange = '7d' | 'month' | 'all';

export const CSV_COLUMNS = [
  'date', 'time', 'merchant', 'amount', 'type',
  'category', 'bank', 'vpa', 'ref', 'note',
] as const;

export const COLUMN_PREVIEW = CSV_COLUMNS.join(', ');

function escapeCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  // Wrap in quotes only when the value contains a comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCsv(transactions: Transaction[]): string {
  const header = CSV_COLUMNS.join(',');
  const rows = transactions.map((tx) =>
    [
      format(new Date(tx.paidAt), 'yyyy-MM-dd'),
      format(new Date(tx.paidAt), 'HH:mm'),
      tx.recipient,
      tx.amount,
      tx.type ?? 'sent',
      tx.category,
      tx.bank ?? '',
      tx.upiId ?? '',
      tx.transactionId ?? '',
      tx.note ?? '',
    ]
      .map(escapeCell)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export function csvFilename(range: ExportDateRange): string {
  const stamp = format(new Date(), 'yyyy-MM-dd');
  const label = range === '7d' ? 'last7days' : range === 'month' ? 'thismonth' : 'alltime';
  return `upi-transactions-${label}-${stamp}.csv`;
}
