import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { colors, typography, spacing } from '../../utils';

interface BroadcastProgressModalProps {
  visible: boolean;
  progress: number;
  message?: string;
  totalUsers?: number;
  onCancel?: () => void;
}

export const BroadcastProgressModal: React.FC<BroadcastProgressModalProps> = ({
  visible,
  progress,
  message = 'Sending broadcast...',
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.message}>{message}</Text>
          <Text style={styles.progress}>{Math.round(progress)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          {onCancel && (
            <Text style={styles.cancelText} onPress={onCancel}>
              Cancel
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    margin: spacing.base,
    alignItems: 'center',
    minWidth: 280,
  },
  message: {
    ...typography.body,
    color: colors.darkText,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  progress: {
    ...typography.sectionHeader,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.lightGrayBg,
    borderRadius: 2,
    marginTop: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  cancelText: {
    ...typography.caption,
    color: colors.mediumGray,
    marginTop: spacing.md,
  },
});