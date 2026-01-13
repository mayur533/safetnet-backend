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
  toggleLocationTracking,
  setNotificationPermissionGranted,
} from '../../store/slices/settingsSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const PrivacyScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);

  const handleToggleLocation = () => {
    if (!settings.locationTrackingEnabled) {
      Alert.alert(
        'Location Permission',
        'This app needs location access to provide geofence alerts and location-based services. Would you like to enable it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => dispatch(toggleLocationTracking()),
          },
        ]
      );
    } else {
      dispatch(toggleLocationTracking());
    }
  };

  const renderSettingItem = (item: {
    title: string;
    subtitle?: string;
    value?: boolean;
    onToggle?: () => void;
    onPress?: () => void;
    type: 'toggle' | 'navigation' | 'info';
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

        {item.type === 'info' && (
          <Text style={styles.infoText}>
            {item.value ? 'Enabled' : 'Disabled'}
          </Text>
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Location Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Services</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Location Tracking',
              subtitle: 'Allow location tracking for geofence alerts',
              type: 'toggle',
              value: settings.locationTrackingEnabled,
              onToggle: handleToggleLocation,
            })}
            {renderSettingItem({
              title: 'Background Location',
              subtitle: 'Continue tracking when app is closed',
              type: 'toggle',
              value: settings.locationTrackingEnabled,
              onToggle: handleToggleLocation,
            })}
            {renderSettingItem({
              title: 'Geofence Alerts',
              subtitle: 'Get notified when entering monitored areas',
              type: 'info',
              value: settings.locationTrackingEnabled,
            })}
          </View>
        </View>

        {/* Data Collection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Analytics',
              subtitle: 'Help improve the app with usage data',
              type: 'toggle',
              value: true, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Crash Reports',
              subtitle: 'Automatically send crash reports',
              type: 'toggle',
              value: true, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Performance Data',
              subtitle: 'Monitor app performance and speed',
              type: 'toggle',
              value: true, // Could be a separate setting
              onToggle: () => {},
            })}
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Camera Access',
              subtitle: 'Required for photo evidence in alerts',
              type: 'info',
              value: true, // Could check actual permission status
            })}
            {renderSettingItem({
              title: 'Storage Access',
              subtitle: 'Save reports and evidence locally',
              type: 'info',
              value: true, // Could check actual permission status
            })}
            {renderSettingItem({
              title: 'Notification Permission',
              subtitle: 'Receive alerts and updates',
              type: 'info',
              value: settings.notificationPermissionGranted,
            })}
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Clear Location History',
              subtitle: 'Remove stored location data',
              type: 'navigation',
              onPress: () => {
                Alert.alert(
                  'Clear Location History',
                  'This will permanently delete all stored location data. Are you sure?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        // Clear location history logic
                        Alert.alert('Success', 'Location history cleared');
                      },
                    },
                  ]
                );
              },
            })}
            {renderSettingItem({
              title: 'Export Data',
              subtitle: 'Download your data for backup',
              type: 'navigation',
              onPress: () => {
                Alert.alert('Coming Soon', 'Data export feature will be available soon');
              },
            })}
            {renderSettingItem({
              title: 'Delete Account',
              subtitle: 'Permanently delete your account and data',
              type: 'navigation',
              onPress: () => {
                Alert.alert(
                  'Delete Account',
                  'This action cannot be undone. All your data will be permanently deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Account',
                      style: 'destructive',
                      onPress: () => {
                        // Delete account logic
                        Alert.alert('Account Deleted', 'Your account has been permanently deleted');
                      },
                    },
                  ]
                );
              },
            })}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem({
              title: 'Biometric Authentication',
              subtitle: 'Use fingerprint/face unlock',
              type: 'toggle',
              value: false, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Two-Factor Authentication',
              subtitle: 'Add extra security layer',
              type: 'toggle',
              value: false, // Could be a separate setting
              onToggle: () => {},
            })}
            {renderSettingItem({
              title: 'Change Password',
              subtitle: 'Update your account password',
              type: 'navigation',
              onPress: () => {
                // Navigate to change password screen
                Alert.alert('Coming Soon', 'Password change feature will be available soon');
              },
            })}
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
  infoText: {
    ...typography.caption,
    color: colors.mediumText,
    fontWeight: '500',
  },
});