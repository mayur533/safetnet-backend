import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GeofenceMapScreen } from './GeofenceMapScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { useColors } from '../../utils/colors';

export const GeofenceMapScreenWithBottomNav = ({ navigation }: any) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <GeofenceMapScreen />
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

