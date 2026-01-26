import React from 'react';
import { GeofenceManagementScreen } from './GeofenceManagementScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';

export const GeofenceManagementScreenWithBottomNav = () => {
  return <BottomTabNavigator MainContent={GeofenceManagementScreen} />;
};