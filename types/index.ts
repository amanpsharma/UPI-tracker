export type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Bills'
  | 'Entertainment'
  | 'Health'
  | 'Other';

export type TransactionSource = 'sms' | 'manual';

export interface Transaction {
  _id: string;
  amount: number;
  recipient: string;
  upiId: string;
  note: string;
  category: Category;
  source: TransactionSource;
  transactionId: string;
  dedupeKey: string;
  paidAt: string;
  createdAt: string;
}

export interface Stats {
  thisMonth: { total: number; count: number };
  allTime: { total: number; count: number };
  byCategory: { _id: Category; total: number; count: number }[];
}
