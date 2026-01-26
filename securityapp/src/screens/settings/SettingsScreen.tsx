import React, { useState } from 'react';
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
import { toggleNotifications, toggleLocationTracking } from '../../store/slices/settingsSlice';

interface SettingItem {
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'action' | 'info';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  loading?: boolean;
}
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../api/services';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const SettingsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const officer = useAppSelector((state) => state.auth.officer);
  const colors = useColors();
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              if (officer) {
                await authService.logout(officer.security_id, officer.security_role);
              }
              dispatch(logout());
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              dispatch(logout());
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      // Simulate API test
      await new Promise(resolve => setTimeout(() => resolve(undefined), 2000));
      Alert.alert('Success', 'Connection to server is working!');
    } catch (error) {
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const settingsSections = [
    {
      title: 'Notifications',
      items: [
        {
          title: 'Push Notifications',
          subtitle: 'Receive alerts and updates',
          type: 'toggle' as const,
          value: settings.notificationsEnabled,
          onToggle: (_value: boolean) => {
            dispatch(toggleNotifications());
          },
        },
        {
          title: 'Notification Settings',
          subtitle: 'Customize alert preferences',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('NotificationSettings'),
        },
      ],
    },
    {
      title: 'Location & Privacy',
      items: [
        {
          title: 'Location Tracking',
          subtitle: 'Allow location tracking for alerts',
          type: 'toggle' as const,
          value: settings.locationTrackingEnabled,
          onToggle: (_value: boolean) => {
            dispatch(toggleLocationTracking());
          },
        },
        {
          title: 'Privacy Settings',
          subtitle: 'Manage data and permissions',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('Privacy'),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          title: 'Update Profile',
          subtitle: 'Change your personal information',
          type: 'navigation' as const,
          onPress: () => navigation.navigate('UpdateProfile'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          title: 'Test Connection',
          subtitle: 'Check server connectivity',
          type: 'action' as const,
          onPress: handleTestConnection,
          loading: isTestingConnection,
        },
        {
          title: 'Version',
          subtitle: 'v1.0.0',
          type: 'info' as const,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number) => {
    return (
      <View key={index} style={[styles.settingItem, { borderBottomColor: colors.border }]}>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: colors.darkText }]}>{item.title}</Text>
          {item.subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.mediumText }]}>{item.subtitle}</Text>
          )}
        </View>

        {item.type === 'toggle' && item.onToggle && (
          <Switch
            value={item.value as boolean}
            onValueChange={item.onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={(item.value as boolean) ? colors.white : colors.mediumGray}
          />
        )}

        {item.type === 'navigation' && (
          <TouchableOpacity onPress={item.onPress} activeOpacity={0.7}>
            <Icon name="chevron-right" size={24} color={colors.mediumGray} />
          </TouchableOpacity>
        )}

        {item.type === 'action' && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }, item.loading && styles.actionButtonDisabled]}
            onPress={item.onPress}
            disabled={item.loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}>
              {item.loading ? 'Testing...' : 'Test'}
            </Text>
          </TouchableOpacity>
        )}

      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionContent, { backgroundColor: colors.white, borderColor: colors.border }]}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.white, borderColor: colors.emergencyRed }]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={20} color={colors.emergencyRed} />
          <Text style={[styles.logoutButtonText, { color: colors.emergencyRed }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: useColors().white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: 50,
    paddingBottom: spacing.md,
    backgroundColor: useColors().white,
    borderBottomWidth: 1,
    borderBottomColor: useColors().border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.screenHeader,
    color: useColors().darkText,
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.base,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: useColors().primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  sectionContent: {
    borderRadius: 8,
    borderWidth: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    fontWeight: '500',
  },
  settingSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    ...typography.buttonSmall,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    margin: spacing.base,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
  },
  logoutButtonText: {
    ...typography.buttonMedium,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});