export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Background colors
  white: string;
  background: string;
  surface: string;
  cardBackground: string;

  // Text colors
  darkText: string;
  mediumText: string;
  lightText: string;
  textOnPrimary: string;

  // Border and separator colors
  border: string;
  divider: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  emergencyRed: string;

  // Special colors
  lightGrayBg: string;
  mediumGray: string;
  shadow: string;

  // Tab and navigation
  tabBackground: string;
  tabActive: string;
  tabInactive: string;

  // Input colors
  inputBackground: string;
  inputBorder: string;
  inputPlaceholder: string;

  // Button colors
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDisabled: string;
}

export const lightTheme: ThemeColors = {
  // Primary colors
  primary: '#2563EB',
  primaryDark: '#1E3A8A',
  primaryLight: '#4DA3FF',

  // Background colors
  white: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',

  // Text colors
  darkText: '#0F172A',
  mediumText: '#64748B',
  lightText: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Border and separator colors
  border: '#E2E8F0',
  divider: '#E2E8F0',

  // Status colors
  success: '#10B981',
  warning: '#F97316',
  error: '#DC2626',
  emergencyRed: '#DC2626',

  // Special colors
  lightGrayBg: '#F8FAFC',
  mediumGray: '#94A3B8',
  shadow: '#000000',

  // Tab and navigation
  tabBackground: '#FFFFFF',
  tabActive: '#2563EB',
  tabInactive: '#94A3B8',

  // Input colors
  inputBackground: '#FFFFFF',
  inputBorder: '#E2E8F0',
  inputPlaceholder: '#94A3B8',

  // Button colors
  buttonPrimary: '#2563EB',
  buttonSecondary: '#F8FAFC',
  buttonDisabled: '#E2E8F0',
};

export const darkTheme: ThemeColors = {
  // Primary colors
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  // Background colors
  white: '#000000',
  background: '#000000',
  surface: '#111827',
  cardBackground: '#000000',

  // Text colors
  darkText: '#FFFFFF',
  mediumText: '#D1D5DB',
  lightText: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Border and separator colors
  border: '#6B7280',
  divider: '#6B7280',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  emergencyRed: '#EF4444',

  // Special colors
  lightGrayBg: '#0F172A',
  mediumGray: '#6B7280',
  shadow: '#000000',

  // Tab and navigation
  tabBackground: '#000000',
  tabActive: '#3B82F6',
  tabInactive: '#9CA3AF',

  // Input colors
  inputBackground: '#1F2937',
  inputBorder: '#374151',
  inputPlaceholder: '#9CA3AF',

  // Button colors
  buttonPrimary: '#3B82F6',
  buttonSecondary: '#1F2937',
  buttonDisabled: '#374151',
};

export type Theme = 'light' | 'dark';
