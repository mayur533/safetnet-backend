import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AlertsScreen } from '../screens/main/AlertsScreen';
import { GeofenceMapScreen } from '../screens/main/GeofenceMapScreen';
import { AlertResponseScreen } from '../screens/main/AlertResponseScreen';
import { UpdateProfileScreen } from '../screens/main/UpdateProfileScreen';
import { BroadcastScreen } from '../screens/main/BroadcastScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { OfflineScreen } from '../screens/common/OfflineScreen';
import { APITestScreen } from '../screens/common/APITestScreen';
import SOSPage from '../components/common/SOSPage';

const Stack = createNativeStackNavigator();

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="GeofenceArea" component={GeofenceMapScreen} />
      <Stack.Screen name="AlertResponse" component={AlertResponseScreen} />
      <Stack.Screen name="UpdateProfile" component={UpdateProfileScreen} />
      <Stack.Screen name="Broadcast" component={BroadcastScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Offline" component={OfflineScreen} />
      <Stack.Screen name="APITest" component={APITestScreen} />
      <Stack.Screen name="SOS" component={SOSPage} />
    </Stack.Navigator>
  );
};