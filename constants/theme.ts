// App-wide theme tokens. Keep this small and stable — components import these
// instead of hardcoding hex values, so a future redesign or dark-mode toggle
// only needs to swap one file.

export const colors = {
  // Surfaces
  bg: '#f5f4f0',          // app background (cream)
  surface: '#ffffff',     // cards
  surfaceMuted: '#f3f4f6',
  divider: '#f3f4f6',
  border: '#e5e7eb',
  borderSoft: '#ebebeb',

  // Text
  text: '#111827',
  textSubtle: '#6b7280',
  textMuted: '#9ca3af',
  textPlaceholder: '#c4c4c4',
  textDisabled: '#d1d5db',

  // Brand / status
  primary: '#22c55e',
  secondary: '#3b82f6',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#ea580c',
  info: '#2563eb',

  // Onboarding accent
  accent: '#7c3aed',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 9999,
} as const;

// Typography font family names (must match useFonts() in app/_layout.tsx)
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  monoRegular: 'GeistMono_400Regular',
  monoSemibold: 'GeistMono_600SemiBold',
  monoBold: 'GeistMono_700Bold',
} as const;

// Reusable shadow presets
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;
