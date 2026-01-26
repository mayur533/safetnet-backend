import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color,
  text,
  fullScreen = false,
}) => {
  const colors = useColors();
  const spinnerColor = color || colors.primary;
  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  text: {
    ...typography.secondary,
    marginTop: spacing.md,
    color: colors.lightText,
  },
});