import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAlertsStore } from '../../store/alertsStore';
import { alertService } from '../../api/services/alertService';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { Alert } from '../../types/alert.types';
import Toast from 'react-native-toast-message';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AlertRespondModalProps {
  visible: boolean;
  alertId: string;
  onClose: () => void;
  onResponseAccepted: () => void;
}

export const AlertRespondModal: React.FC<AlertRespondModalProps> = ({
  visible,
  alertId,
  onClose,
  onResponseAccepted,
}) => {
  const colors = useColors();
  const { updateAlert: storeUpdateAlert } = useAlertsStore();
  
  const [alert, setAlert] = useState<Alert | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);

  // Countdown timer for auto-close
  useEffect(() => {
    if (autoCloseCountdown !== null && autoCloseCountdown > 0) {
      const timer = setTimeout(() => {
        setAutoCloseCountdown(autoCloseCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (autoCloseCountdown === 0) {
      onClose();
      onResponseAccepted();
    }
  }, [autoCloseCountdown, onClose, onResponseAccepted]);

  // Fetch alert details when modal opens
  useEffect(() => {
    if (!visible || !alertId) return;

    const fetchAlert = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('📡 Fetching alert details for modal:', alertId);
        const alertData = await alertService.getAlertById(alertId);
        setAlert(alertData);
        console.log('✅ Alert details fetched for modal:', alertData);
      } catch (error: any) {
        console.error('❌ Failed to fetch alert details for modal:', error);
        
        // Handle specific 404 error (alert not found)
        if (error.status === 404 || error.message?.includes('No SOSAlert matches the given query')) {
          setError('This alert may have been deleted or is no longer available.');
          // Start countdown for auto-close
          setAutoCloseCountdown(3);
        } else if (error.message) {
          setError(error.message);
        } else {
          setError('Failed to load alert details. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlert();
  }, [visible, alertId]);

  // Handle accept alert response
  const handleAcceptAlert = async () => {
    if (!alert) return;

    try {
      setIsAccepting(true);
      console.log('📞 Accepting alert response for ID:', alert.id);

      // Change status to 'accepted'
      await storeUpdateAlert(alert.id, { status: 'accepted' });

      console.log('✅ Alert response accepted successfully');

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Response Accepted',
        text2: 'You are now responding to this alert.',
        visibilityTime: 3000,
        position: 'bottom',
      });

      // Close modal and notify parent
      onResponseAccepted();
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to accept alert response:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept alert response. Please try again.',
        visibilityTime: 3000,
        position: 'bottom',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
    } catch (error) {
      return 'Unknown time';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.white }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <Icon name="warning" size={24} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.darkText }]}>
                Respond to Alert
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.mediumText} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mediumText }]}>
                  Loading alert details...
                </Text>
              </View>
            ) : error || !alert ? (
              <View style={styles.errorContainer}>
                <Icon name="error" size={48} color={colors.emergencyRed} />
                <Text style={styles.errorText}>
                  {error || 'Alert not found'}
                </Text>
                {autoCloseCountdown !== null ? (
                  <Text style={styles.countdownText}>
                    Closing automatically in {autoCloseCountdown}...
                  </Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      // Retry fetching by resetting state and triggering useEffect
                      setAlert(null);
                      setError(null);
                      setAutoCloseCountdown(null);
                      setIsLoading(true);
                    }}
                  >
                    <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                {/* Alert Type and Time */}
                <View style={styles.alertHeader}>
                  <View style={styles.alertTypeContainer}>
                    <Icon
                      name={alert.alert_type === 'emergency' ? 'warning' : 'notification-important'}
                      size={20}
                      color={alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warning}
                    />
                    <Text style={[
                      styles.alertType,
                      { color: alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warning }
                    ]}>
                      {alert.alert_type.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.alertTime, { color: colors.mediumText }]}>
                    {formatTime(alert.created_at)}
                  </Text>
                </View>

                {/* Alert Message */}
                <View style={[styles.messageContainer, { backgroundColor: colors.lightGrayBg }]}>
                  <Text style={[styles.messageLabel, { color: colors.mediumText }]}>Message:</Text>
                  <Text style={[styles.messageText, { color: colors.darkText }]}>
                    {alert.message}
                  </Text>
                </View>

                {/* Alert Description */}
                {alert.description && (
                  <View style={[styles.descriptionContainer, { backgroundColor: colors.lightGrayBg }]}>
                    <Text style={[styles.descriptionLabel, { color: colors.mediumText }]}>Details:</Text>
                    <Text style={[styles.descriptionText, { color: colors.darkText }]}>
                      {alert.description}
                    </Text>
                  </View>
                )}

                {/* User Information */}
                <View style={styles.userInfoContainer}>
                  <Text style={[styles.userInfoLabel, { color: colors.mediumText }]}>From:</Text>
                  <View style={styles.userDetails}>
                    <Icon name="person" size={16} color={colors.primary} />
                    <Text style={[styles.userName, { color: colors.darkText }]}>
                      {alert.user_name || 'Unknown User'}
                    </Text>
                  </View>
                  {alert.user_phone && (
                    <View style={styles.userDetails}>
                      <Icon name="phone" size={16} color={colors.primary} />
                      <Text style={[styles.userPhone, { color: colors.darkText }]}>
                        {alert.user_phone}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status */}
                <View style={styles.statusContainer}>
                  <Text style={[styles.statusLabel, { color: colors.mediumText }]}>Status:</Text>
                  <Text style={[
                    styles.statusText,
                    { color: alert.status === 'pending' ? colors.warning : colors.success }
                  ]}>
                    {alert.status || 'pending'}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Footer Actions */}
          {!isLoading && !error && alert && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.lightGrayBg }]}
                onPress={onClose}
                disabled={isAccepting}
              >
                <Text style={[styles.cancelButtonText, { color: colors.darkText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  { backgroundColor: colors.success },
                  isAccepting && styles.acceptButtonDisabled
                ]}
                onPress={handleAcceptAlert}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color={colors.textOnPrimary} />
                    <Text style={[styles.acceptButtonText, { color: colors.textOnPrimary }]}>
                      Accept & Respond
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: Math.min(screenWidth * 0.9, 400),
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...typography.screenHeader,
    marginLeft: spacing.sm,
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    maxHeight: screenHeight * 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  alertType: {
    ...typography.caption,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  alertTime: {
    ...typography.caption,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageContainer: {
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  messageLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    fontWeight: '600',
  },
  descriptionContainer: {
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  descriptionText: {
    ...typography.body,
  },
  userInfoContainer: {
    marginBottom: spacing.md,
  },
  userInfoLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  userPhone: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusLabel: {
    ...typography.caption,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    ...typography.body,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  countdownText: {
    ...typography.caption,
    color: '#64748B', // mediumText color
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});
