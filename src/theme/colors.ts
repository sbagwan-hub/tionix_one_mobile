export const Colors = {
  primary: '#FF4D1C', // Fiery brand orange-red
  primaryDark: '#D82C00', // Deep fiery orange
  primaryLight: '#FFA040', // Warm bright orange
  primaryGradient: ['#FF8C00', '#FF4D1C', '#D82C00'] as const, // Gorgeous fiery orange/red gradient
  
  accent: '#FFB300', // Brilliant gold/amber from the logo highlights
  accentDark: '#FF8F00',
  accentGradient: ['#FFE082', '#FFB300', '#FF8F00'] as const, // Warm amber/gold gradient
  
  secondary: '#475569', // Slate grey from "ONE"
  background: '#F8FAFC', // Crisp, soft silver-slate background
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9', // Slightly darker slate for backgrounds
  
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  
  // Interactive inputs focus states
  inputFocusedBorder: '#FF4D1C',
  inputBgFocused: '#FFF5F2',
  
  text: '#1E293B', // Extremely premium slate-black matching "ONE" text shadow
  textSecondary: '#475569', // Slate dark grey
  textMuted: '#94A3B8', // Soft slate
  
  white: '#FFFFFF',
  black: '#0F172A',
  
  success: '#10B981',
  successDark: '#047857',
  successGradient: ['#34D399', '#10B981', '#059669'] as const,
  
  error: '#EF4444',
  errorDark: '#B91C1C',
  errorSoft: '#FEF2F2',
  errorGradient: ['#F87171', '#EF4444', '#DC2626'] as const,
  
  warning: '#FFB300',
  warningDark: '#FF8F00',
  warningGradient: ['#FFE082', '#FFB300', '#FF8F00'] as const,
  
  overlay: 'rgba(15, 23, 42, 0.45)',
  tabInactive: '#94A3B8',
  
  // Glassmorphic properties
  glassOverlay: 'rgba(255, 255, 255, 0.16)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',
};

import { moderateScale } from '../utils/responsive';

export const Theme = {
  colors: Colors,
  spacing: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(40),
  },
  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(6),
    lg: moderateScale(8),
    xl: moderateScale(8),
    xxl: moderateScale(10),
    pill: moderateScale(24),
  },
  shadow: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 3,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 6,
    },
  },
};
