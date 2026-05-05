import { Category } from '@/types';

export const API_BASE_URL = 'http://192.168.1.68:3001/api';

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: 'food',
  Transport: 'car',
  Shopping: 'shopping',
  Bills: 'file-document',
  Entertainment: 'music',
  Health: 'hospital',
  Other: 'dots-horizontal',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#FF6B6B',
  Transport: '#4ECDC4',
  Shopping: '#45B7D1',
  Bills: '#FFA07A',
  Entertainment: '#98D8C8',
  Health: '#7EC8A4',
  Other: '#A0A0A0',
};

export const CATEGORIES: Category[] = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Health',
  'Other',
];
