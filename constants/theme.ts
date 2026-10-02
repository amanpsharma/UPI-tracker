// App-wide theme tokens — fresh modern light design system
// Clean whites, soft neutrals, vibrant accents

export const colors = {
  // Surfaces
  bg: '#F8F9FC', // soft cool white
  bgSecondary: '#FFFFFF', // pure white
  surface: '#FFFFFF', // card background
  surfaceElevated: '#F1F3F8', // slightly tinted
  surfaceGlass: 'rgba(255,255,255,0.85)',
  divider: '#EEF0F5',
  border: '#E8EBF0',
  borderSoft: '#F1F3F8',

  // Text
  text: '#1A1D26',
  textSecondary: '#5E6478',
  textMuted: '#8F95A8',
  textPlaceholder: '#B5BAC9',
  textDisabled: '#CDD1DC',

  // Brand / accent
  primary: '#6366F1', // indigo
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primarySoft: 'rgba(99,102,241,0.08)',
  secondary: '#06B6D4', // cyan
  secondaryLight: '#22D3EE',
  accent: '#F43F5E', // rose

  // Status
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.08)',
  success: '#10B981',
  successSoft: 'rgba(16,185,129,0.08)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.08)',
  info: '#3B82F6',

  // Gradients
  gradientPrimary: ['#6366F1', '#818CF8'],
  gradientAccent: ['#F43F5E', '#FB7185'],
  gradientSuccess: ['#10B981', '#34D399'],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
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
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardElevated: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;
