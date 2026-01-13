import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  toggleNotifications,
  setNotificationPermissionGranted,
} from '../../store/slices/settingsSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleToggleNotifications = () => {
    if (!settings.notificationsEnabled && !settings.notificationPermissionGranted) {
      // If notifications are disabled and permission not granted, show alert
      Alert.alert(
        'Enable Notifications',
        'Notifications are currently disabled. Would you like to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => {
              dispatch(setNotificationPermissionGranted(true));
              dispatch(toggleNotifications());
            },
          },
        ]
      );
    } else {
      dispatch(toggleNotifications());
    }
  };

  const renderSettingItem = (item: {
    title: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: () => void;
    onPress?: () => void;
    type: 'toggle' | 'navigation';
  }) => {
    return (
      <View key={item.title} style={styles.settingItem}>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>

        {item.type === 'toggle' && (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={item.value ? colors.white : colors.mediumGray}
          />
        )}

        {item.type === 'navigation' && (
          <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
            <Icon name="chevron-right" size={24} color={colors.mediumGray} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* General Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Push Notifications',
              subtitle: 'Receive alerts and updates',
              type: 'toggle',
              value: settings.notificationsEnabled,
              onToggle: handleToggleNotifications,
            })}
            {renderSettingItem({
              title: 'Emergency Alerts',
              subtitle: 'Critical security notifications',
              type: 'toggle',
              value: settings.notificationsEnabled, // Could be separate setting
              onToggle: handleToggleNotifications,
            })}
          </View>
        </View>

        {/* Alert Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Types</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Security Alerts',
              subtitle: 'Intrusion and breach notifications',
              type: 'toggle',
              value: settings.notificationsEnabled,
              onToggle: handleToggleNotifications,
            })}
            {renderSettingItem({
              title: 'Location Updates',
              subtitle: 'Geofence entry/exit alerts',
              type: 'toggle',
              value: settings.notificationsEnabled,
              onToggle: handleToggleNotifications,
            })}
            {renderSettingItem({
              title: 'System Status',
              subtitle: 'Service availability updates',
              type: 'toggle',
              value: settings.notificationsEnabled,
              onToggle: handleToggleNotifications,
            })}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Quiet Hours',
              subtitle: 'Disable notifications 10 PM - 6 AM',
              type: 'toggle',
              value: false, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Do Not Disturb',
              subtitle: 'Temporarily silence all notifications',
              type: 'toggle',
              value: false, // Could be a separate setting
              onToggle: () => {},
            })}
          </View>
        </View>

        {/* Advanced */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Vibration',
              subtitle: 'Vibrate for notifications',
              type: 'toggle',
              value: true, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Sound',
              subtitle: 'Play notification sounds',
              type: 'toggle',
              value: true, // Could be a separate setting
              onToggle: () => {},
            })}
          </View>
        </View>

        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Status</Text>
          <View style={styles.sectionContent}>
            <View style={styles.permissionItem}>
              <View style={styles.permissionInfo}>
                <Text style={styles.permissionTitle}>Notification Permission</Text>
                <Text style={[styles.permissionStatus, {
                  color: settings.notificationPermissionGranted ? colors.successGreen : colors.emergencyRed
                }]}>
                  {settings.notificationPermissionGranted ? 'Granted' : 'Not Granted'}
                </Text>
              </View>
              {!settings.notificationPermissionGranted && (
                <TouchableOpacity
                  style={styles.grantButton}
                  onPress={() => {
                    dispatch(setNotificationPermissionGranted(true));
                    Alert.alert('Success', 'Notification permissions granted!');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.grantButtonText}>Grant</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: 50, // Account for status bar
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
  },
  placeholder: {
    width: 40, // Match back button width
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.darkText,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: colors.darkText,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: 2,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    ...typography.body,
    color: colors.darkText,
    fontWeight: '500',
  },
  permissionStatus: {
    ...typography.caption,
    marginTop: 2,
  },
  grantButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  grantButtonText: {
    ...typography.buttonSmall,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },
});