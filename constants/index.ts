import { Platform } from 'react-native';
import { Category } from '@/types';

export const API_BASE_URL = 'https://seablack.onrender.com/api';

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
  Food: '#F43F5E',
  Transport: '#06B6D4',
  Shopping: '#8B5CF6',
  Bills: '#F59E0B',
  Entertainment: '#EC4899',
  Health: '#10B981',
  Other: '#8F95A8',
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

// Maps UPI handle keywords / merchant names → category
export const MERCHANT_CATEGORY_MAP: { pattern: RegExp; category: Category }[] = [
  { pattern: /swiggy|zomato|blinkit|dunzo|zepto|burger|pizza|kfc|mcdonalds|dominos|starbucks|cafe|restaurant|food/i, category: 'Food' },
  { pattern: /uber|ola|rapido|redbus|irctc|railway|metro|petrol|fuel|parking|toll/i, category: 'Transport' },
  { pattern: /amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|shopsy|reliance|dmart|bigbasket|grofers|blinkit/i, category: 'Shopping' },
  { pattern: /electricity|water|gas|broadband|jio|airtel|bsnl|vodafone|vi|tata|recharge|bill|insurance|emi|loan/i, category: 'Bills' },
  { pattern: /netflix|hotstar|spotify|youtube|prime|bookmyshow|pvr|inox|gaming|game/i, category: 'Entertainment' },
  { pattern: /hospital|clinic|pharmacy|apollo|medplus|health|doctor|lab|diagnostic|med/i, category: 'Health' },
];
