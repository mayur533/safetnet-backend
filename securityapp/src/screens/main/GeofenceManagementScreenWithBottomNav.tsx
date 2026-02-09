import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GeofenceManagementScreen } from './GeofenceManagementScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { useColors } from '../../utils/colors';

export const GeofenceManagementScreenWithBottomNav = ({ navigation }: any) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GeofenceManagementScreen />
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});