import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

interface AcceptAlertModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  alertTitle?: string;
  estimatedTime?: string;
}

export const AcceptAlertModal: React.FC<AcceptAlertModalProps> = ({
  visible,
  onClose,
  onAccept,
  alertTitle = 'Emergency Alert',
  estimatedTime = '5-10 minutes',
}) => {
  const colors = useColors();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.white }]}>
          <View style={styles.header}>
            <Icon name="warning" size={32} color={colors.emergencyRed} />
            <Text style={[styles.title, { color: colors.darkText }]}>{alertTitle}</Text>
          </View>

          <Text style={[styles.message, { color: colors.mediumGray }]}>
            You are about to accept this alert. Estimated response time: {estimatedTime}.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.acceptText}>Accept Alert</Text>
            </TouchableOpacity>
          </View>
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
    padding: spacing.lg,
    margin: spacing.base,
    maxWidth: 400,
    width: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.sectionHeader,
    color: colors.darkText,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.mediumGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.lightGrayBg,
    borderWidth: 1,
    borderColor: colors.borderGray,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  cancelText: {
    ...typography.buttonMedium,
    color: colors.mediumGray,
  },
  acceptText: {
    ...typography.buttonMedium,
    color: colors.white,
  },
});