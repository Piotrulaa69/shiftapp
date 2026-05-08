export const theme = {
  colors: {
    // Core brand — blue
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    navy: '#1E3A5F',
    accent: '#3B82F6',

    // Semantic
    orange: '#EA580C',
    orangeLight: '#FFF7ED',
    green: '#16A34A',
    greenLight: '#F0FDF4',
    purple: '#7C3AED',
    purpleLight: '#F5F3FF',
    yellow: '#CA8A04',
    yellowLight: '#FEFCE8',

    // Surfaces — warm light
    background: '#F5F4EF',
    card: '#FFFFFF',
    surface: '#F0EEE9',

    // Text
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',

    // Utility
    border: '#E8E4DC',
    white: '#FFFFFF',
    error: '#DC2626',
    errorLight: '#FEF2F2',
    success: '#16A34A',
    warning: '#CA8A04',

    // Gradient
    gradientStart: '#2563EB',
    gradientEnd: '#60A5FA',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
    h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
    h3: { fontSize: 18, fontWeight: '600' as const },
    h4: { fontSize: 16, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const },
    bodySmall: { fontSize: 13, fontWeight: '400' as const },
    label: { fontSize: 12, fontWeight: '600' as const },
    caption: { fontSize: 11, fontWeight: '400' as const },
  },
  shadows: {
    card: {
      shadowColor: '#1A1D23',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    medium: {
      shadowColor: '#1A1D23',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
    fab: {
      shadowColor: '#2563EB',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
  },
};
