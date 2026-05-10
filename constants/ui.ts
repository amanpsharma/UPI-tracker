// Shared UI constants used across multiple screens.

export const AVATAR_PALETTE = [
  { bg: '#fecaca', text: '#dc2626' },
  { bg: '#fed7aa', text: '#ea580c' },
  { bg: '#fef08a', text: '#ca8a04' },
  { bg: '#bbf7d0', text: '#16a34a' },
  { bg: '#bfdbfe', text: '#2563eb' },
  { bg: '#ddd6fe', text: '#7c3aed' },
  { bg: '#fbcfe8', text: '#db2777' },
  { bg: '#cffafe', text: '#0891b2' },
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
