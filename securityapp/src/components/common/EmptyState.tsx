import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

interface EmptyStateProps {
  icon: string | React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {typeof icon === 'string' ? (
        <Icon name={icon} size={80} color={colors.mediumGray} style={styles.icon} />
      ) : (
        icon
      )}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.lightText }]}>{description}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.actionButton}>
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.screenHeader,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 260,
    marginBottom: spacing.lg,
  },
  actionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionText: {
    ...typography.secondary,
    textDecorationLine: 'underline',
  },
});