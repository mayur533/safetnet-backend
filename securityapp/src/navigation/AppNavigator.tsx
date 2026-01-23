import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearNavigateToSOS, logout } from '../store/slices/authSlice';

export const AppNavigator = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const shouldNavigateToSOS = useAppSelector((state) => state.auth.shouldNavigateToSOS || false);
  const dispatch = useAppDispatch();
  const navigationRef = useRef<any>(null);

  console.log('[AppNavigator] isAuthenticated:', isAuthenticated, 'shouldNavigateToSOS:', shouldNavigateToSOS);

  useEffect(() => {
    if (isAuthenticated && shouldNavigateToSOS && navigationRef.current) {
      // Small delay to ensure MainNavigator is mounted
      setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.navigate('SOS');
        }
        dispatch(clearNavigateToSOS());
      }, 200);
    }
  }, [isAuthenticated, shouldNavigateToSOS, dispatch]);

  // Listen for auth logout events from API client
  useEffect(() => {
    const logoutSubscription = DeviceEventEmitter.addListener('auth:logout', (data) => {
      console.log('[AppNavigator] Auth logout event received:', data);
      dispatch(logout());

      // Reset navigation to auth stack
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        });
      }
    });

    return () => {
      logoutSubscription.remove();
    };
  }, [dispatch]);

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};