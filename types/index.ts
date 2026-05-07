export type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export type TransactionSource = 'sms' | 'manual';
export type TransactionType = 'sent' | 'received';

export interface Transaction {
  _id: string;
  amount: number;
  recipient: string;
  upiId: string;
  note: string;
  category: Category;
  source: TransactionSource;
  type: TransactionType;
  transactionId: string;
  dedupeKey: string;
  paidAt: string;
  createdAt: string;
}

export interface MonthlyData {
  month: string; // YYYY-MM
  spent: number;
  received: number;
  count: number;
  topCategory: string | null;
}

export interface Stats {
  thisMonth: { total: number; count: number };
  lastMonth: { total: number; count: number };
  allTime: { total: number; count: number };
  byCategory: { _id: Category; total: number; count: number }[];
}
