import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { colors } from '../../utils/colors';

export const SplashScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigation.replace('Dashboard');
      } else {
        navigation.replace('Login');
      }
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>SafeTNet</Text>
        <Text style={styles.subtitleText}>Security Officer App</Text>
      </View>
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.mediumGray,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 14,
    color: colors.mediumGray,
  },
});