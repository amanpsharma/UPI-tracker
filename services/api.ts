import axios, { AxiosError, AxiosHeaders } from 'axios';
import { API_BASE_URL } from '@/constants';
import { Category, MonthlyData, Stats, Transaction, TransactionType } from '@/types';
import { trackSlowRequest } from './serverStatus';

// Error thrown by the response interceptor — carries the HTTP status alongside the message
export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// 60s timeout — Render free tier spins servers down after ~15min idle and the
// first request takes ~10s to cold-start. Combined with our token-fetch wait,
// 15s wasn't enough.
const client = axios.create({ baseURL: API_BASE_URL, timeout: 60000 });

// Injected by TokenSetup in _layout.tsx. Server requires a signature-verified
// Clerk JWT — the previous X-User-Id-only path is gone (it allowed userId spoofing).
let _getToken: (() => Promise<string | null>) | null = null;
let _isLoaded: boolean = false;
let _isSignedIn: boolean = false;

export function setTokenProvider(fn: (() => Promise<string | null>) | null) {
  _getToken = fn;
}
// Kept for backwards-compatibility with existing imports — now a no-op.
// Server only trusts cryptographically-verified JWTs.
export function setUserId(_uid: string | null | undefined) {}
export function setAuthState(isLoaded: boolean, isSignedIn: boolean) {
  _isLoaded = isLoaded;
  _isSignedIn = isSignedIn;
}

client.interceptors.request.use(async (config) => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  // Fail fast if Clerk has confirmed the user is signed out
  if (_isLoaded && !_isSignedIn) {
    throw new Error('Not signed in. Request aborted silently.');
  }

  // Wait up to 5s for the token provider to wire up after sign-in
  for (let i = 0; i < 25 && !_getToken; i++) {
    if (_isLoaded && !_isSignedIn) throw new Error('Not signed in. Request aborted silently.');
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!_getToken) {
    throw new Error('Not signed in. Please sign in again.');
  }

  // Fetch a signed JWT, retrying for ~3s while Clerk's session settles
  let token: string | null = null;
  for (let i = 0; i < 6; i++) {
    try {
      token = await _getToken();
    } catch {}
    if (token) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!token) {
    throw new Error('Session expired. Please sign in again.');
  }

  config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Subscribers are notified once when the server returns 401 (session expired
// or token rejected). _layout.tsx wires this to sign the user out and toast.
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

// Debounce so a burst of 401s (e.g. parallel home+activity refresh) only fires once
let lastUnauthorizedAt = 0;
function notifyUnauthorized() {
  const now = Date.now();
  if (now - lastUnauthorizedAt < 3000) return;
  lastUnauthorizedAt = now;
  for (const l of unauthorizedListeners) l();
}

// Surface the server's error message instead of the generic Axios status message
client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    const status = err.response?.status;
    const serverMsg = err.response?.data?.error;

    if (status === 401) {
      notifyUnauthorized();
    }

    if (serverMsg) {
      return Promise.reject(new ApiError(serverMsg, status));
    }
    return Promise.reject(err);
  }
);

// Retries transient network failures (no response) up to `retries` times with
// linear back-off. API-level errors (ApiError with an HTTP status) are thrown
// immediately — retrying a 4xx/5xx is unlikely to help.
async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err instanceof ApiError) throw err;
      if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export const api = {
  getTransactions: (params?: {
    category?: Category;
    source?: string;
    type?: TransactionType;
    from?: string;
    to?: string;
    limit?: number;
    skip?: number;
    search?: string;
  }) =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(client.get<Transaction[]>('/transactions', { params }));
      return data;
    }),

  getTransaction: (id: string): Promise<Transaction> =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(client.get<Transaction>(`/transactions/${id}`));
      return data;
    }),

  getStats: (month?: string): Promise<Stats> =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(
        client.get<Stats>('/transactions/stats', { params: month ? { month } : undefined }),
      );
      return data;
    }),

  getTrend: (days = 30): Promise<{ date: string; total: number; count: number }[]> =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(client.get('/transactions/trend', { params: { days } }));
      return data;
    }),

  addTransaction: async (tx: Omit<Transaction, '_id' | 'createdAt'>): Promise<Transaction> => {
    const { data } = await trackSlowRequest(client.post<Transaction>('/transactions', tx));
    return data;
  },

  bulkAdd: async (transactions: Omit<Transaction, '_id' | 'createdAt'>[]): Promise<number> => {
    const { data } = await trackSlowRequest(
      client.post<{ inserted: number }>('/transactions/bulk', { transactions }),
    );
    return data.inserted;
  },

  updateTransaction: async (
    id: string,
    patch: Partial<Pick<Transaction, 'category' | 'note' | 'amount' | 'recipient' | 'upiId' | 'bank' | 'type'>>,
  ): Promise<Transaction> => {
    const { data } = await trackSlowRequest(client.patch<Transaction>(`/transactions/${id}`, patch));
    return data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await trackSlowRequest(client.delete(`/transactions/${id}`));
  },

  getTransactionCount: (): Promise<number> =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(client.get<{ count: number }>('/transactions/count'));
      return data.count;
    }),

  getMonthly: (): Promise<MonthlyData[]> =>
    withRetry(async () => {
      const { data } = await trackSlowRequest(client.get<MonthlyData[]>('/transactions/monthly'));
      return data;
    }),
};
