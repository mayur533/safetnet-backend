import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const colors = useColors();

  const getButtonBackgroundColor = () => {
    if (disabled || loading) return colors.buttonDisabled;
    switch (variant) {
      case 'primary': return colors.buttonPrimary;
      case 'secondary': return colors.buttonSecondary;
      case 'danger': return colors.emergencyRed;
      default: return colors.buttonPrimary;
    }
  };

  const getButtonBorderColor = () => {
    if (variant === 'secondary' && !(disabled || loading)) {
      return colors.buttonPrimary;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled || loading) return colors.mediumGray;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.textOnPrimary;
      case 'secondary':
        return colors.buttonPrimary;
      default:
        return colors.textOnPrimary;
    }
  };

  const buttonStyles = [
    styles.button,
    {
      backgroundColor: getButtonBackgroundColor(),
      borderColor: getButtonBorderColor(),
      borderWidth: variant === 'secondary' ? 2 : 0,
    },
    (disabled || loading) && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    { color: getTextColor() },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.buttonLarge,
    textTransform: 'uppercase',
  },
});