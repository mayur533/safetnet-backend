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
import { toggleNotifications, toggleLocationTracking, toggleDarkMode } from '../../store/slices/settingsSlice';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../api/services';
import { colors, typography, spacing } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const SettingsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const officer = useAppSelector((state) => state.auth.officer);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
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
          onToggle: () => dispatch(toggleNotifications()),
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
          onToggle: () => dispatch(toggleLocationTracking()),
        },
        {
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          type: 'toggle' as const,
          value: settings.isDarkMode,
          onToggle: () => dispatch(toggleDarkMode()),
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

  const renderSettingItem = (item: typeof settingsSections[0]['items'][0], index: number) => {
    return (
      <View key={index} style={styles.settingItem}>
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

        {item.type === 'action' && (
          <TouchableOpacity
            style={[styles.actionButton, item.loading && styles.actionButtonDisabled]}
            onPress={item.onPress}
            disabled={item.loading}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>
              {item.loading ? 'Testing...' : 'Test'}
            </Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Icon name="logout" size={20} color={colors.emergencyRed} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: 50,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
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
    color: colors.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: 8,
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
    color: colors.mediumGray,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.emergencyRed,
    margin: spacing.base,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xl,
  },
  logoutButtonText: {
    ...typography.buttonMedium,
    color: colors.emergencyRed,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
});