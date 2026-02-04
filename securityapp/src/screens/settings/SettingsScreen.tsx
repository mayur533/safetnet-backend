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
import { toggleNotifications, toggleLocationTracking, setThemeMode } from '../../store/slices/settingsSlice';

interface SettingItem {
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'action' | 'info' | 'theme';
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  loading?: boolean;
  themeOptions?: { value: string; label: string; icon: string }[];
  selectedTheme?: string;
  onThemeChange?: (theme: string) => void;
}
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../api/services';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, spacing } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const SettingsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const officer = useAppSelector((state) => state.auth.officer);
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      marginBottom: spacing.md,
      paddingHorizontal: spacing.base,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    sectionIcon: {
      marginRight: spacing.xs,
    },
    sectionTitle: {
      ...typography.cardTitle,
      color: colors.primary,
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
    themeOptions: {
      flexDirection: 'row',
      gap: 8,
    },
    themeContainer: {
      flexDirection: 'row',
      gap: 8,
      paddingVertical: 2,
    },
    themeOptionCard: {
      flex: 1,
      padding: spacing.xs,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 45,
      position: 'relative',
    },
    themeOptionContent: {
      alignItems: 'center',
      gap: 2,
    },
    themeOption: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      borderWidth: 1,
      minWidth: 80,
      alignItems: 'center',
    },
    themeOptionText: {
      ...typography.caption,
      fontWeight: '500',
      fontSize: 10,
      textAlign: 'center',
    },
    selectedIndicator: {
      position: 'absolute',
      top: 4,
      right: 4,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
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
                await authService.logout();
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

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          title: 'Theme',
          subtitle: 'Choose your preferred app theme',
          type: 'theme' as const,
          themeOptions: [
            { value: 'light', label: 'Light', icon: 'light-mode' },
            { value: 'dark', label: 'Dark', icon: 'dark-mode' },
            { value: 'system', label: 'System', icon: 'settings-system-daydream' },
          ],
          selectedTheme: settings.themeMode,
          onThemeChange: (theme: string) => {
            dispatch(setThemeMode(theme as 'light' | 'dark' | 'system'));
          },
        },
      ],
    },
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
      title: 'Support',
      items: [
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

        {item.type === 'theme' && item.themeOptions && (
          <View style={styles.themeContainer}>
            {item.themeOptions.map((option, index) => {
              const isSelected = item.selectedTheme === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.white,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      shadowColor: isSelected ? colors.primary : 'transparent',
                      shadowOffset: { width: 0, height: isSelected ? 2 : 0 },
                      shadowOpacity: isSelected ? 0.2 : 0,
                      shadowRadius: isSelected ? 4 : 0,
                      elevation: isSelected ? 3 : 1,
                    },
                  ]}
                  onPress={() => item.onThemeChange?.(option.value)}
                  activeOpacity={0.8}
                >
                  <View style={styles.themeOptionContent}>
                    <Icon 
                      name={option.icon} 
                      size={16} 
                      color={isSelected ? colors.white : colors.primary} 
                    />
                    <Text
                      style={[
                        styles.themeOptionText,
                        {
                          color: isSelected ? colors.white : colors.darkText,
                          fontWeight: isSelected ? '600' : '500',
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: colors.primary }]}>
                      <Icon name="check-circle" size={16} color={colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
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
            <View style={styles.sectionHeader}>
              {section.title === 'Appearance' && (
                <Icon name="palette" size={20} color={colors.primary} style={styles.sectionIcon} />
              )}
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
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