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
  primary: '#0A84FF',
  primaryDark: '#007AFF',
  primaryLight: '#5AC8FA',

  // Background colors
  white: '#1C1C1E',
  background: '#000000',
  surface: '#1C1C1E',
  cardBackground: '#2C2C2E',

  // Text colors
  darkText: '#FFFFFF',
  mediumText: '#EBEBF5',
  lightText: '#8E8E93',
  textOnPrimary: '#FFFFFF',

  // Border and separator colors
  border: '#38383A',
  divider: '#38383A',

  // Status colors
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  emergencyRed: '#FF453A',

  // Special colors
  lightGrayBg: '#1C1C1E',
  mediumGray: '#8E8E93',
  shadow: '#000000',

  // Tab and navigation
  tabBackground: '#1C1C1E',
  tabActive: '#0A84FF',
  tabInactive: '#8E8E93',

  // Input colors
  inputBackground: '#2C2C2E',
  inputBorder: '#38383A',
  inputPlaceholder: '#8E8E93',

  // Button colors
  buttonPrimary: '#0A84FF',
  buttonSecondary: '#48484A',
  buttonDisabled: '#38383A',
};

export type Theme = 'light' | 'dark';
export { lightTheme, darkTheme };