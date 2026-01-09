import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { clearNavigateToSOS } from '../store/slices/authSlice';

export const AppNavigator = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const shouldNavigateToSOS = useAppSelector((state) => state.auth.shouldNavigateToSOS || false);
  const dispatch = useAppDispatch();
  const navigationRef = useRef<any>(null);

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

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};