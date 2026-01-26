import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProfileScreen } from './ProfileScreen';
import { BottomTabNavigator } from '../../components/navigation/BottomTabNavigator';
import { useColors } from '../../utils/colors';

export const ProfileScreenWithBottomNav = ({ navigation }: any) => {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.lightGrayBg }]}>
      <ProfileScreen />
      <BottomTabNavigator />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

