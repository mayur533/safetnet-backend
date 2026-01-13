import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AlertsScreen } from './AlertsScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { useColors } from '../../utils/colors';

export const AlertsScreenWithBottomNav = ({ navigation }: any) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.lightGrayBg }]}>
      <AlertsScreen />
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

