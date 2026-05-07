import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/constants';
import { Category, MonthlyData, Stats, Transaction, TransactionType } from '@/types';

const client = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Surface the server's error message instead of the generic Axios status message
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    const serverMsg = err.response?.data?.error;
    if (serverMsg) {
      const wrapped = new Error(serverMsg);
      (wrapped as any).status = err.response?.status;
      return Promise.reject(wrapped);
    }
    return Promise.reject(err);
  }
);

export const api = {
  getTransactions: async (params?: {
    category?: Category;
    source?: string;
    type?: TransactionType;
    from?: string;
    to?: string;
    limit?: number;
    skip?: number;
    search?: string;
  }) => {
    const { data } = await client.get<Transaction[]>('/transactions', { params });
    return data;
  },

  getTransaction: async (id: string): Promise<Transaction> => {
    const { data } = await client.get<Transaction>(`/transactions/${id}`);
    return data;
  },

  getStats: async (): Promise<Stats> => {
    const { data } = await client.get<Stats>('/transactions/stats');
    return data;
  },

  getTrend: async (days = 30): Promise<{ date: string; total: number; count: number }[]> => {
    const { data } = await client.get('/transactions/trend', { params: { days } });
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

  updateTransaction: async (
    id: string,
    patch: Partial<Pick<Transaction, 'category' | 'note' | 'amount' | 'recipient'>>
  ): Promise<Transaction> => {
    const { data } = await client.patch<Transaction>(`/transactions/${id}`, patch);
    return data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await client.delete(`/transactions/${id}`);
  },

  getMonthly: async (): Promise<MonthlyData[]> => {
    const { data } = await client.get<MonthlyData[]>('/transactions/monthly');
    return data;
  },
};
