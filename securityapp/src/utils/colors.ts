// Static colors object for backward compatibility and non-themed components
// Components should use useColors() hook for theme-aware colors
export const colors = {
  // Primary Colors
  primary: '#2563EB',
  primaryDark: '#1E3A8A',
  primaryLight: '#4DA3FF',
  secondary: '#1E3A8A',
  darkBackground: '#0F172A',

  // Background Colors
  white: '#FFFFFF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',
  lightGrayBg: '#F8FAFC',

  // Text Colors
  darkText: '#0F172A',
  mediumText: '#64748B',
  lightText: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  // Border and separator colors
  borderGray: '#E2E8F0',
  border: '#E2E8F0',
  divider: '#E2E8F0',
  captionText: '#94A3B8',
  mediumGray: '#94A3B8',

  // Alert Colors
  emergencyRed: '#DC2626',
  warningOrange: '#F97316',
  successGreen: '#10B981',
  infoBlue: '#3B82F6',

  // Accent Colors
  badgeRedBg: '#FEE2E2',
  badgeOrangeBg: '#FED7AA',
  badgeGreenBg: '#D1FAE5',
  badgeBlueBg: '#DBEAFE',

  // Status Colors
  online: '#10B981',
  offline: '#94A3B8',
  pending: '#F97316',
  completed: '#10B981',

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

// Export static colors for light theme
export const useColors = () => colors;