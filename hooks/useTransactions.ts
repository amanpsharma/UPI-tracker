import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Category, TransactionType } from '@/types';

export const queryKeys = {
  transactions: ['transactions'] as const,
  stats: (month?: string) => ['stats', month ?? 'current'] as const,
  trend: (days: number) => ['trend', days] as const,
  count: ['transactionCount'] as const,
  monthly: ['monthly'] as const,
};

export function useStats(month?: string) {
  return useQuery({
    queryKey: queryKeys.stats(month),
    queryFn: () => api.getStats(month),
    staleTime: 30_000,
  });
}

export function useTrend(days = 7) {
  return useQuery({
    queryKey: queryKeys.trend(days),
    queryFn: () => api.getTrend(days),
    staleTime: 30_000,
  });
}

export function useRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: [...queryKeys.transactions, 'recent', limit],
    queryFn: () => api.getTransactions({ limit }),
    staleTime: 10_000,
  });
}

export function useTransactionCount() {
  return useQuery({
    queryKey: queryKeys.count,
    queryFn: () => api.getTransactionCount(),
    staleTime: 30_000,
  });
}

export function useMonthly() {
  return useQuery({
    queryKey: queryKeys.monthly,
    queryFn: () => api.getMonthly(),
    staleTime: 60_000,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.count });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tx: Parameters<typeof api.addTransaction>[0]) => api.addTransaction(tx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: queryKeys.count });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['trend'] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateTransaction>[1] }) =>
      api.updateTransaction(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useTopRecipients(month: string, limit = 10) {
  const [year, mon] = month.split('-').map(Number);
  const from = new Date(year, mon - 1, 1).toISOString();
  const to = new Date(year, mon, 0, 23, 59, 59).toISOString();

  return useQuery({
    queryKey: ['topRecipients', month],
    queryFn: async () => {
      const txns = await api.getTransactions({ from, to, limit: 500 });
      const sentTxns = txns.filter((tx) => (tx.type ?? 'sent') === 'sent');
      const map: Record<string, { recipient: string; total: number; count: number }> = {};
      for (const tx of sentTxns) {
        const key = tx.recipient || tx.upiId || 'Unknown';
        if (!map[key]) map[key] = { recipient: key, total: 0, count: 0 };
        map[key].total += tx.amount;
        map[key].count += 1;
      }
      return Object.values(map)
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
    },
    staleTime: 30_000,
  });
}

export function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}
