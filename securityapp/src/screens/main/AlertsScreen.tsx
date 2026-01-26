import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AlertCard } from '../../components/alerts/AlertCard';
import { EmptyState } from '../../components/common/EmptyState';
import { Alert } from '../../types/alert.types';
import { alertService } from '../../api/services/alertService';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { useAlertsStore } from '../../store/alertsStore';

export const AlertsScreen = forwardRef(({ navigation }: any, ref) => {
  // Use Zustand alerts store
  const {
    alerts,
    isLoading,
    error,
    fetchAlerts,
    createAlert: storeCreateAlert,
    updateAlert: storeUpdateAlert,
    deleteAlert: storeDeleteAlert
    // resolveAlert: storeResolveAlert // TODO: Enable once TypeScript issue resolved
  } = useAlertsStore();

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'emergency' | 'pending' | 'accepted' | 'completed'>('all');

  // Create alert modal state (local to this screen)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [alertType, setAlertType] = useState<'emergency' | 'security' | 'general'>('security');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertDescription, setAlertDescription] = useState('');

  // Reset filter and fetch alerts when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🚨 AlertsScreen: Screen focused, resetting filter and fetching alerts...');
      setSelectedFilter('all');
      fetchAlerts();
    }, [fetchAlerts])
  );

  // Handle filter changes - only refetch for 'all' filter to ensure fresh data
  useEffect(() => {
    if (selectedFilter === 'all') {
      console.log('🔄 Fetching all alerts for filter...');
      fetchAlerts();
    }
  }, [selectedFilter, fetchAlerts]);

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    fetchAlertsWithRetry: () => {
      console.log('🔄 Refreshing alerts list from parent component');
      fetchAlerts();
    }
  }));

  // Aggressive retry logic to fetch real data
  const onRefresh = useCallback(async () => {
    console.log('🔄 Refreshing alerts from pull-to-refresh...');
    await fetchAlerts();
  }, [fetchAlerts]);

  const handleRespond = async (alert: Alert) => {
    console.log('🗺️ Navigating to respond map for alert:', alert.id);
    (navigation as any).navigate('AlertRespondMap', { alertId: alert.id });
  };

  const handleDelete = async (alert: Alert) => {
    try {
      console.log('📱 AlertsScreen: handleDelete called for alert:', alert.id);
      await storeDeleteAlert(alert.id);
      console.log('✅ AlertsScreen: Alert deleted successfully');
      RNAlert.alert('Success', 'Alert deleted successfully!');
    } catch (error: any) {
      console.error('❌ AlertsScreen: Failed to delete alert:', error);
      const errorMessage = error?.message || 'Failed to delete alert. Please try again.';
      RNAlert.alert('Error', errorMessage);
    }
  };

  const handleSolve = async (alert: Alert) => {
    try {
      console.log('✅ Resolving alert:', alert.id);
      // TODO: Use storeResolveAlert once TypeScript issue is resolved
      await storeUpdateAlert(alert.id, { status: 'completed' });
      console.log('✅ Alert resolved successfully');
      RNAlert.alert('Success', 'Alert marked as solved!');
    } catch (error) {
      console.error('❌ Failed to resolve alert:', error);
      RNAlert.alert('Error', 'Failed to mark alert as solved. Please try again.');
    }
  };

  // Create new alert function
  const handleCreateAlert = async () => {
    if (!alertMessage.trim()) {
      RNAlert.alert('Error', 'Please enter an alert message');
      return;
    }

    setCreatingAlert(true);
    try {
      console.log('🚨 Creating alert via store...');
      await storeCreateAlert({
        alert_type: alertType,
        message: alertMessage.trim(),
        description: alertDescription.trim() || alertMessage.trim(),
      });

      // Reset form and close modal
      setAlertMessage('');
      setAlertDescription('');
      setAlertType('security');
      setCreateModalVisible(false);

      RNAlert.alert('Success', 'Alert created successfully!');
    } catch (error) {
      console.error('Error creating alert:', error);
      RNAlert.alert('Error', 'Failed to create alert. Please try again.');
    } finally {
      setCreatingAlert(false);
    }
  };

  // Filter alerts based on selected section
  const getFilteredAlerts = () => {
    if (selectedFilter === 'all') return alerts;
    if (selectedFilter === 'emergency') return alerts.filter(alert => alert.alert_type === 'emergency' || alert.priority === 'high');
    if (selectedFilter === 'pending') return alerts.filter(alert => alert.status === 'pending' || !alert.status);
    if (selectedFilter === 'accepted') return alerts.filter(alert => alert.status === 'accepted');
    if (selectedFilter === 'completed') return alerts.filter(alert => alert.status === 'completed');
    return alerts;
  };

  const renderAlertItem = ({ item }: { item: Alert }) => (
    <AlertCard
      alert={item}
      onRespond={handleRespond}
      onDelete={handleDelete}
      onSolve={handleSolve}
    />
  );

  // Show loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.darkText }]}>Loading alerts...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7, color: colors.darkText }]}>
          Connecting to SafeTNet backend
        </Text>
      </View>
    );
  }

  // Show error state with network-aware messaging
  if (error && alerts.length === 0) {
    const isNetworkError = error.includes('SSL connection') || error.includes('Network Error') || error.includes('timeout') || error.includes('ECONNREFUSED');
    const errorTitle = isNetworkError ? 'Backend Server Unavailable' : 'Error Loading Alerts';
    const errorMessage = isNetworkError
      ? 'SafeTNet backend server is currently unavailable.\n\nPlease ensure the Django server is running.'
      : error;

    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <Icon name={isNetworkError ? 'wifi-off' : 'error'} size={48} color={colors.emergencyRed} />
        <Text style={[styles.errorTitle, { color: colors.emergencyRed }]}>{errorTitle}</Text>
        <Text style={[styles.errorText, { color: colors.mediumText, textAlign: 'center', lineHeight: 20 }]}>{errorMessage}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.lightGrayBg }]}>
      <View style={[styles.header, {
        backgroundColor: colors.white,
        shadowColor: colors.darkText,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Icon name="notifications" size={20} color={colors.white} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.darkText }]}>Security Alerts</Text>
              <Text style={[styles.headerSubtitle, { color: colors.mediumText }]}>Monitor and respond</Text>
            </View>
          </View>
          <View style={styles.headerStats}>
            <View style={[styles.statBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.statText, { color: colors.white }]}>{alerts.length}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Sections - Horizontal Scrollable */}
      <View style={[styles.filterSection, {
        backgroundColor: colors.white,
        shadowColor: colors.darkText
      }]}>
        <View style={styles.filterHeader}>
          <Icon name="filter-list" size={16} color={colors.mediumText} />
          <Text style={[styles.filterTitle, { color: colors.mediumText }]}>Filter by Status</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.filterContainer}
        >
        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'all' ? colors.primary : 'rgba(37, 99, 235, 0.1)',
            borderColor: selectedFilter === 'all' ? colors.primary : 'rgba(37, 99, 235, 0.2)'
          }]}
          onPress={() => setSelectedFilter('all')}
        >
          <Icon name="list" size={16} color={selectedFilter === 'all' ? colors.white : colors.primary} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'all' ? colors.white : colors.primary }]}>All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'emergency' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'emergency' ? colors.emergencyRed : 'rgba(220, 38, 38, 0.1)',
            borderColor: selectedFilter === 'emergency' ? colors.emergencyRed : 'rgba(220, 38, 38, 0.2)'
          }]}
          onPress={() => setSelectedFilter('emergency')}
        >
          <Icon name="warning" size={16} color={selectedFilter === 'emergency' ? colors.white : colors.emergencyRed} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'emergency' ? colors.white : colors.emergencyRed }]}>Emergency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'pending' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'pending' ? colors.warningOrange : 'rgba(249, 115, 22, 0.1)',
            borderColor: selectedFilter === 'pending' ? colors.warningOrange : 'rgba(249, 115, 22, 0.2)'
          }]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Icon name="schedule" size={16} color={selectedFilter === 'pending' ? colors.white : colors.warningOrange} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'pending' ? colors.white : colors.warningOrange }]}>Pending</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'accepted' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'accepted' ? colors.successGreen : 'rgba(16, 185, 129, 0.1)',
            borderColor: selectedFilter === 'accepted' ? colors.successGreen : 'rgba(16, 185, 129, 0.2)'
          }]}
          onPress={() => setSelectedFilter('accepted')}
        >
          <Icon name="check-circle" size={16} color={selectedFilter === 'accepted' ? colors.white : colors.successGreen} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'accepted' ? colors.white : colors.successGreen }]}>Accepted</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, selectedFilter === 'completed' && styles.filterButtonActive, {
            backgroundColor: selectedFilter === 'completed' ? colors.primary : 'rgba(37, 99, 235, 0.1)',
            borderColor: selectedFilter === 'completed' ? colors.primary : 'rgba(37, 99, 235, 0.2)'
          }]}
          onPress={() => setSelectedFilter('completed')}
        >
          <Icon name="done-all" size={16} color={selectedFilter === 'completed' ? colors.white : colors.primary} style={styles.filterIcon} />
          <Text style={[styles.filterText, { color: selectedFilter === 'completed' ? colors.white : colors.primary }]}>Completed</Text>
        </TouchableOpacity>

        </ScrollView>
      </View>

      {getFilteredAlerts().length > 0 ? (
        <FlatList
          data={getFilteredAlerts()}
          keyExtractor={(item) => {
            console.log('🔑 FlatList keyExtractor for alert:', item.id, item.message?.substring(0, 30));
            return String(item.id); // Ensure it's always a string
          }}
          renderItem={renderAlertItem}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="notifications-off"
            title={alerts.length === 0 ? "No Alerts" : `No ${selectedFilter === 'all' ? 'Alerts' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Alerts`}
            description={
              alerts.length === 0
                ? "All quiet on the security front!"
                : `No alerts match the "${selectedFilter === 'all' ? 'All Alerts' : selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)}" filter.`
            }
          />
        </View>
      )}

      {/* Create Alert Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.darkText }]}>Create New Alert</Text>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={colors.mediumText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Alert Type Selection */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Alert Type</Text>
              <View style={styles.alertTypeContainer}>
                {[
                  { key: 'emergency', label: 'Emergency', color: colors.emergencyRed, icon: 'warning' },
                  { key: 'security', label: 'Security', color: colors.warningOrange, icon: 'security' },
                  { key: 'general', label: 'General', color: colors.primary, icon: 'info' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.alertTypeButton,
                      {
                        backgroundColor: alertType === type.key ? type.color : colors.lightGrayBg,
                        borderColor: alertType === type.key ? type.color : colors.border,
                      }
                    ]}
                    onPress={() => setAlertType(type.key as any)}
                  >
                    <Icon
                      name={type.icon as any}
                      size={20}
                      color={alertType === type.key ? colors.white : type.color}
                      style={styles.alertTypeIcon}
                    />
                    <Text style={[
                      styles.alertTypeText,
                      { color: alertType === type.key ? colors.white : colors.darkText }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Alert Message Input */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Alert Message *</Text>
              <TextInput
                style={[styles.textInput, {
                  borderColor: colors.border,
                  backgroundColor: colors.lightGrayBg,
                  color: colors.darkText
                }]}
                placeholder="Enter alert message..."
                placeholderTextColor={colors.mediumText}
                value={alertMessage}
                onChangeText={setAlertMessage}
                multiline
                numberOfLines={3}
                maxLength={200}
              />

              {/* Alert Description Input */}
              <Text style={[styles.inputLabel, { color: colors.darkText }]}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.descriptionInput, {
                  borderColor: colors.border,
                  backgroundColor: colors.lightGrayBg,
                  color: colors.darkText
                }]}
                placeholder="Additional details..."
                placeholderTextColor={colors.mediumText}
                value={alertDescription}
                onChangeText={setAlertDescription}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setCreateModalVisible(false)}
                disabled={creatingAlert}
              >
                <Text style={[styles.modalButtonText, { color: colors.mediumText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  {
                    backgroundColor: creatingAlert ? colors.mediumText : (
                      alertType === 'emergency' ? colors.emergencyRed :
                      alertType === 'security' ? colors.warningOrange : colors.primary
                    )
                  }
                ]}
                onPress={handleCreateAlert}
                disabled={creatingAlert || !alertMessage.trim()}
              >
                {creatingAlert ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Icon name="send" size={18} color={colors.white} style={styles.buttonIcon} />
                    <Text style={[styles.modalButtonText, { color: colors.white }]}>Create Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerTitle: {
    ...typography.screenHeader,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  headerSubtitle: {
    ...typography.caption,
    fontSize: 12,
    opacity: 0.7,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typography.screenHeader,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.buttonSmall,
    fontWeight: '600',
  },
  filterSection: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.base,
    borderRadius: 12,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  filterTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  filterText: {
    ...typography.caption,
    fontWeight: '500',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 12,
  },
  filterIcon: {
    marginRight: 6,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
    marginLeft: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.screenHeader,
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
    flex: 1,
  },
  inputLabel: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  alertTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginHorizontal: 2,
    borderWidth: 2,
  },
  alertTypeIcon: {
    marginRight: spacing.xs,
  },
  alertTypeText: {
    ...typography.buttonSmall,
    fontWeight: '600',
    fontSize: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
    ...typography.body,
  },
  descriptionInput: {
    minHeight: 100,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 12,
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  modalButtonText: {
    ...typography.buttonSmall,
    fontWeight: '600',
    fontSize: 14,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
});

