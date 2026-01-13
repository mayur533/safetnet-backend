import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MainNavigator } from '../../navigation/MainNavigator';
import { useColors } from '../../utils/colors';

interface MainLayoutProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showBottomNav = true,
}) => {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {children}
      {showBottomNav && <MainNavigator />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
});












