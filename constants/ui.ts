// Shared UI constants used across multiple screens.

export const AVATAR_PALETTE = [
  { bg: '#EEF2FF', text: '#6366F1' },
  { bg: '#FFF1F2', text: '#F43F5E' },
  { bg: '#ECFEFF', text: '#06B6D4' },
  { bg: '#ECFDF5', text: '#10B981' },
  { bg: '#FFF7ED', text: '#F59E0B' },
  { bg: '#F5F3FF', text: '#8B5CF6' },
  { bg: '#FFF1F3', text: '#E11D48' },
  { bg: '#F0F9FF', text: '#0EA5E9' },
] as const;

export function avatarStyle(name: string) {
  return AVATAR_PALETTE[(name || 'U').charCodeAt(0) % AVATAR_PALETTE.length];
}

// Display labels for category enum values (longer than the enum keys for UI)
export const CAT_DISPLAY: Record<string, string> = {
  Food: 'Food & Dining',
  Transport: 'Transport',
  Shopping: 'Shopping',
  Bills: 'Bills & Utilities',
  Entertainment: 'Entertainment',
  Health: 'Health',
  Other: 'Other',
};

// Visual shape used for category icons (circle/square/diamond) for variety
export const CAT_SHAPE: Record<string, 'circle' | 'square' | 'diamond'> = {
  Food: 'circle',
  Transport: 'square',
  Shopping: 'diamond',
  Bills: 'circle',
  Entertainment: 'diamond',
  Health: 'circle',
  Other: 'square',
};
