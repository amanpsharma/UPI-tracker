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

// Maps UPI handle keywords / merchant names → category
export const MERCHANT_CATEGORY_MAP: { pattern: RegExp; category: Category }[] = [
  { pattern: /swiggy|zomato|blinkit|dunzo|zepto|burger|pizza|kfc|mcdonalds|dominos|starbucks|cafe|restaurant|food/i, category: 'Food' },
  { pattern: /uber|ola|rapido|redbus|irctc|railway|metro|petrol|fuel|parking|toll/i, category: 'Transport' },
  { pattern: /amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|shopsy|reliance|dmart|bigbasket|grofers|blinkit/i, category: 'Shopping' },
  { pattern: /electricity|water|gas|broadband|jio|airtel|bsnl|vodafone|vi|tata|recharge|bill|insurance|emi|loan/i, category: 'Bills' },
  { pattern: /netflix|hotstar|spotify|youtube|prime|bookmyshow|pvr|inox|gaming|game/i, category: 'Entertainment' },
  { pattern: /hospital|clinic|pharmacy|apollo|medplus|health|doctor|lab|diagnostic|med/i, category: 'Health' },
];
