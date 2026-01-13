import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  activeIcon?: string;
}

const tabs: TabItem[] = [
  { name: 'DashboardTab', label: 'Dashboard', icon: 'dashboard', activeIcon: 'dashboard' },
  { name: 'AlertsTab', label: 'Alerts', icon: 'notifications-none', activeIcon: 'notifications' },
  { name: 'GeofenceTab', label: 'Geofence', icon: 'location-on', activeIcon: 'location-on' },
  { name: 'ProfileTab', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  { name: 'SettingsTab', label: 'Settings', icon: 'settings', activeIcon: 'settings' },
];

export const BottomTabNavigator = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const colors = useColors();

  const getActiveRouteName = () => {
    const state = navigation.getState();
    if (!state || !state.routes) return '';

    const route = state.routes[state.index];
    if (!route) return '';

    // Check if route has nested state
    if (route.state) {
      const nestedState = route.state;
      if (nestedState.routes && nestedState.index !== undefined && nestedState.routes[nestedState.index]) {
        return nestedState.routes[nestedState.index].name;
      }
    }
    return route.name || '';
  };

  const activeRoute = getActiveRouteName();

  const handleTabPress = (tabName: string) => {
    try {
      // Navigate to the specific tab
      (navigation as any).navigate('MainTabs', { screen: tabName });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        // Check if this tab is active
        const isActive = activeRoute === tab.name;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <Icon
              name={(isActive && tab.activeIcon) ? tab.activeIcon : tab.icon}
              size={24}
              color={isActive ? colors.primary : colors.lightText}
              style={styles.icon}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  icon: {
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.lightText,
    fontSize: 12,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -spacing.sm,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});