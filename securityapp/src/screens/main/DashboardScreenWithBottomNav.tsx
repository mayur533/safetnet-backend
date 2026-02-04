import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardScreen } from './DashboardScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { useColors } from '../../utils/colors';

export const DashboardScreenWithBottomNav = ({ navigation }: any) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DashboardScreen />
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});












