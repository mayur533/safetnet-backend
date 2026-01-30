import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert as RNAlert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Alert } from '../../types/alert.types';
import { colors } from '../../utils/colors';
import { shadows } from '../../utils';
import { formatRelativeTime, formatExactTime } from '../../utils/helpers';

interface AlertCardProps {
  alert: Alert;
  onRespond: (alert: Alert) => void;
  onDelete?: (alert: Alert) => void;
  onSolve?: (alert: Alert) => void;
  onUpdate?: (alert: Alert) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, onRespond, onDelete, onSolve, onUpdate }) => {
  // Check if emergency based on original_alert_type or alert_type
  const isEmergency = alert.original_alert_type === 'emergency' ||
                      alert.original_alert_type === 'warning' ||
                      alert.alert_type === 'emergency';

  // Check if alert is completed or resolved
  const alertStatus = alert.status ? String(alert.status).toLowerCase() : '';
  const isCompleted = alertStatus === 'completed' || alertStatus === 'resolved';
  const isAccepted = alert.status === 'accepted';

  const handleDelete = () => {
    console.log('🗑️ AlertCard: Delete button pressed for alert:', alert.id);
    // Directly call onDelete without showing RNAlert - let the parent handle confirmation
    onDelete && onDelete(alert);
  };

  // Get alert type description
  const getAlertTypeDescription = (): { type: string; description: string } => {
    // Check if this is a high priority alert
    const isHighPriority = alert.priority?.toLowerCase() === 'high';

    if (isHighPriority) {
      return {
        type: 'Emergency Alert',
        description: 'Critical alert requiring immediate response and action'
      };
    }

    // Prefer original_alert_type if available
    const displayType = alert.original_alert_type || alert.alert_type || 'normal';

    const typeInfoMap: Record<string, { type: string; description: string }> = {
      general: {
        type: 'General Notice',
        description: 'Informational alert for general updates and announcements'
      },
      warning: {
        type: 'Warning',
        description: 'Cautionary alert requiring attention and immediate awareness'
      },
      emergency: {
        type: 'Emergency',
        description: 'Critical alert requiring immediate response and action'
      },
      normal: {
        type: 'Normal Alert',
        description: 'Standard alert for routine notifications'
      },
      security: {
        type: 'Security Alert',
        description: 'Security-related alert requiring security personnel attention'
      },
    };

    const safeDisplayType = typeof displayType === 'string' ? displayType : 'normal';
    return typeInfoMap[safeDisplayType] || {
      type: safeDisplayType.charAt(0).toUpperCase() + safeDisplayType.slice(1) + ' Alert',
      description: 'Alert notification'
    };
  };

  const getBadgeStyle = () => {
    if (isEmergency) {
      return {
        backgroundColor: colors.badgeRedBg,
        text: '🚨 EMERGENCY',
        textColor: colors.emergencyRed,
      };
    }
    if (isCompleted) {
      return {
        backgroundColor: colors.badgeGreenBg,
        text: '✓ SOLVED',
        textColor: colors.successGreen,
      };
    }
    return {
      backgroundColor: colors.badgeBlueBg,
      text: '🔔 ACTIVE',
      textColor: colors.infoBlue,
    };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <View
      style={[
        { backgroundColor: colors.white },
        styles.card,
        isEmergency && styles.emergencyCard,
        isCompleted && styles.completedCard,
      ]}
    >
      <View
        style={[
          styles.leftAccent,
          {
            backgroundColor: isEmergency
              ? colors.emergencyRed
              : (isCompleted ? colors.successGreen : colors.infoBlue),
          },
        ]}
      />

      <View style={styles.cardContent}>
        {/* Status Badge */}
        <View style={[styles.badge, { backgroundColor: badgeStyle.backgroundColor }]}>
          <Text style={[styles.badgeText, { color: badgeStyle.textColor }]}>
            {badgeStyle.text}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Alert Type Details */}
          <View style={styles.alertDetailsRow}>
            <View style={styles.alertTypeContainer}>
              <Icon
                name={
                  isEmergency
                    ? 'warning'
                    : alert.alert_type === 'security'
                      ? 'security'
                      : 'notifications'
                }
                size={14}
                color={isEmergency ? colors.emergencyRed : colors.infoBlue}
              />
              <View style={styles.alertTypeInfo}>
                <Text style={[styles.alertTypeText, isCompleted && styles.completedText]}>
                  {getAlertTypeDescription().type}
                </Text>
                <Text style={[styles.alertTypeDescription, isCompleted && styles.completedText]} numberOfLines={1}>
                  {getAlertTypeDescription().description}
                </Text>
              </View>
            </View>
            {alert.priority && (
              <View style={[
                styles.priorityBadge,
                alert.priority === 'high' && styles.priorityHigh,
                alert.priority === 'medium' && styles.priorityMedium,
                alert.priority === 'low' && styles.priorityLow,
              ]}>
                <Text style={styles.priorityText}>{alert.priority.toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.userName, isCompleted && styles.completedText]}>
            {alert.user_name}
          </Text>
          
          {/* Location indicator */}
          {(alert.location_lat && alert.location_long) && (
            <View style={styles.locationContainer}>
              <Icon name="location-on" size={12} color={colors.mediumText} />
              <Text style={styles.locationText}>
                {alert.location_lat.toFixed(4)}, {alert.location_long.toFixed(4)}
              </Text>
            </View>
          )}
          <Text style={[styles.message, isCompleted && styles.completedText]} numberOfLines={2}>
            {alert.message}
          </Text>

          <Text style={[styles.timestamp, isCompleted && styles.completedText]}>
            {formatExactTime(alert.created_at || alert.timestamp)}
          </Text>
          <Text style={[styles.relativeTime, isCompleted && styles.completedText]}>
            {formatRelativeTime(alert.created_at || alert.timestamp)}
          </Text>
        </View>

        {/* Bottom buttons section */}
        {isCompleted ? (
          <View style={styles.completedActions}>
            <View style={styles.solvedBadge}>
              <Icon name="check-circle" size={18} color={colors.successGreen} />
              <Text style={styles.solvedBadgeText}>SOLVED</Text>
            </View>
          </View>
        ) : isAccepted ? (
          <View style={styles.acceptedActions}>
            {onSolve ? (
              <TouchableOpacity
                style={styles.solveButton}
                onPress={() => onSolve(alert)}
                activeOpacity={0.7}
              >
                <Icon name="check-circle" size={18} color={colors.white} />
                <Text style={styles.solveButtonText}>MARK SOLVED</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.acceptedBadge}>
                <Icon name="check-circle" size={18} color={colors.successGreen} />
                <Text style={styles.acceptedText}>RESPOND ACCEPTED</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Top row: Update and Delete buttons */}
            <View style={styles.topButtonsContainer}>
              {onUpdate && (
                <TouchableOpacity
                  style={styles.updateButtonTop}
                  onPress={() => onUpdate(alert)}
                  activeOpacity={0.7}
                >
                  <Icon name="edit" size={18} color={colors.warningOrange} />
                  <Text style={styles.updateButtonTextTop}>UPDATE</Text>
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  style={styles.deleteButtonTop}
                  onPress={handleDelete}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color={colors.emergencyRed} />
                  <Text style={styles.deleteButtonTextTop}>DELETE</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Bottom row: Respond button */}
            <View style={styles.respondButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.respondButtonBottom,
                  isEmergency && styles.respondButtonBottomEmergency,
                ]}
                onPress={() => onRespond(alert)}
                activeOpacity={0.7}
              >
                <Text style={styles.respondButtonBottomText}>RESPOND</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    ...shadows.md,
  },
  emergencyCard: {
    ...shadows.emergency,
  },
  completedCard: {
    opacity: 0.6,
  },
  leftAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardContent: {
    flex: 1,
    paddingLeft: 4,
  },
  content: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  alertDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E7EB',
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flex: 1,
  },
  alertTypeInfo: {
    flex: 1,
  },
  alertTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 2,
  },
  alertTypeDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.captionText,
    lineHeight: 14,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.lightGrayBg,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  priorityLow: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.darkText,
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 11,
    color: colors.mediumText,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.lightText,
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.captionText,
  },
  relativeTime: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.captionText,
    marginTop: 2,
    opacity: 0.8,
  },
  completedText: {
    opacity: 0.7,
  },
  bottomButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  respondButtonBottom: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  respondButtonBottomEmergency: {
    backgroundColor: colors.emergencyRed,
  },
  respondButtonBottomText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.5,
  },
  deleteButtonBottom: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 6,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.emergencyRed,
    letterSpacing: 0.5,
  },
  updateButtonBottom: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: 6,
  },
  updateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningOrange,
    letterSpacing: 0.5,
  },
  // New layout styles
  topButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  updateButtonTop: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    gap: 6,
  },
  updateButtonTextTop: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warningOrange,
    letterSpacing: 0.5,
  },
  deleteButtonTop: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 6,
  },
  deleteButtonTextTop: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.emergencyRed,
    letterSpacing: 0.5,
  },
  respondButtonContainer: {
    marginTop: 8,
  },
  completedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  solvedBadge: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.badgeGreenBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  solvedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.successGreen,
    letterSpacing: 0.5,
  },
  acceptedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border || '#E5E7EB',
  },
  acceptedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.badgeGreenBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptedText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.successGreen,
    letterSpacing: 0.5,
  },
  solveButton: {
    width: '100%',
    height: 44,
    backgroundColor: colors.successGreen,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.md,
  },
  solveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.5,
  },
});