import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AlertsScreen } from '../screens/main/AlertsScreen';
import { GeofenceMapScreen } from '../screens/main/GeofenceMapScreen';
import { AlertResponseScreen } from '../screens/main/AlertResponseScreen';
import { UpdateProfileScreen } from '../screens/main/UpdateProfileScreen';
import { BroadcastScreen } from '../screens/main/BroadcastScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { PrivacyScreen } from '../screens/settings/PrivacyScreen';
import { SearchScreen } from '../screens/common/SearchScreen';
import { OfflineScreen } from '../screens/common/OfflineScreen';
import { APITestScreen } from '../screens/test/APITestScreen';
import SOSPage from '../components/common/SOSPage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../utils/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main screens
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mediumGray,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.borderGray,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Icon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AlertsTab"
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Icon name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GeofenceTab"
        component={GeofenceMapScreen}
        options={{
          tabBarLabel: 'Geofence',
          tabBarIcon: ({ color, size }) => (
            <Icon name="location-on" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
      <Stack.Screen name="AlertResponse" component={AlertResponseScreen} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
      <Stack.Screen name="Broadcast" component={BroadcastScreen} />
      <Stack.Screen name="Search" component={SearchScreen} />
      <Stack.Screen name="Offline" component={OfflineScreen} />
      <Stack.Screen name="APITest" component={APITestScreen} />
      <Stack.Screen name="LeafletMap" component={LeafletMapScreen} />
      <Stack.Screen name="SOS" component={SOSPage} />
    </Stack.Navigator>
  );
};