import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '@/constants';
import { Category, MonthlyData, Stats, Transaction, TransactionType } from '@/types';

const client = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

// Injected by TokenSetup in _layout.tsx whenever Clerk's auth state changes.
// We send the Clerk userId in an X-User-Id header — a JWT would be stronger but
// Clerk Expo's getToken() has been observed to return null reliably, so we use
// the userId directly. Server is private (only this app talks to it).
let _getToken: (() => Promise<string | null>) | null = null;
let _userId: string | null = null;

export function setTokenProvider(fn: (() => Promise<string | null>) | null) {
  _getToken = fn;
}
export function setUserId(uid: string | null | undefined) {
  _userId = uid ?? null;
}

client.interceptors.request.use(async (config) => {
  if (!config.headers) {
    config.headers = {} as any;
  }

  // Best-effort: attach JWT if Clerk happens to return one
  let token: string | null = null;
  if (_getToken) {
    try {
      token = await _getToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {}
  }

  // Wait up to 5s for TokenSetup to populate _userId after sign-in
  // Only wait if we don't already have a token
  if (!token) {
    for (let i = 0; i < 25 && !_userId; i++) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (_userId) {
    config.headers['X-User-Id'] = _userId;
  } else if (!token) {
    console.warn('[api] no userId and no token after 5s — user is signed out');
    throw new Error('Not signed in. Please sign in again.');
  }

  return config;
});

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

  getStats: async (month?: string): Promise<Stats> => {
    const { data } = await client.get<Stats>('/transactions/stats', {
      params: month ? { month } : undefined,
    });
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

  getTransactionCount: async (): Promise<number> => {
    const { data } = await client.get<{ count: number }>('/transactions/count');
    return data.count;
  },

  getMonthly: async (): Promise<MonthlyData[]> => {
    const { data } = await client.get<MonthlyData[]>('/transactions/monthly');
    return data;
  },
};
