import axios from 'axios';
import { API_BASE_URL } from '@/constants';
import { Category, Stats, Transaction } from '@/types';

const client = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });

export const api = {
  getTransactions: async (params?: {
    category?: Category;
    source?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const { data } = await client.get<Transaction[]>('/transactions', { params });
    return data;
  },

  getStats: async (): Promise<Stats> => {
    const { data } = await client.get<Stats>('/transactions/stats');
    return data;
  },

  addTransaction: async (tx: Omit<Transaction, '_id' | 'createdAt'>): Promise<Transaction> => {
    const { data } = await client.post<Transaction>('/transactions', tx);
    return data;
  },

  bulkAdd: async (transactions: Omit<Transaction, '_id' | 'createdAt'>[]): Promise<number> => {
    const { data } = await client.post<{ inserted: number }>('/transactions/bulk', {
      transactions,
    });
    return data.inserted;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await client.delete(`/transactions/${id}`);
  },
};
