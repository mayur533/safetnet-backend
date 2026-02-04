/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

declare global {
  var __REMOTEDEV__: boolean;
}

import React, { useEffect } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { AppNavigator } from './navigation/AppNavigator';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginSuccess } from './store/slices/authSlice';
import Toast from 'react-native-toast-message';

// Disable debugger connections to prevent registration errors
if (__DEV__) {
  // Disable remote debugging connections
  (console as any).disableDebugger = true;
  // Prevent debugger WebSocket connections
  global.__REMOTEDEV__ = false;
}

// Component that checks for persisted auth data
function AuthPersistenceWrapper({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  // COMMENTED OUT: Auto-restore authentication to force login screen first
  // useEffect(() => {
  //   const checkPersistedAuth = async () => {
  //     try {
  //       const token = await AsyncStorage.getItem('token');
  //       const refreshToken = await AsyncStorage.getItem('refresh_token');
  //
  //       if (token && refreshToken) {
  //         console.log('[App] Found persisted auth tokens, restoring authentication...');
  //         dispatch(loginSuccess({
  //           token,
  //           officer: null, // Will be fetched when needed
  //         }));
  //         console.log('[App] Authentication restored, should show main app');
  //       } else {
  //         console.log('[App] No persisted tokens found, showing login');
  //       }
  //     } catch (error) {
  //       console.error('[App] Error checking persisted auth:', error);
  //     }
  //   };
  //
  //   checkPersistedAuth();
  // }, [dispatch]);

  console.log('[App] Login screen will appear first (auto-auth disabled)');

  return <>{children}</>;
}

// Component that uses theme context for status bar
function AppContent() {
  const { currentTheme } = useTheme();
  
  return (
    <AuthPersistenceWrapper>
      <StatusBar 
        barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} 
        backgroundColor={currentTheme === 'dark' ? '#000000' : '#FFFFFF'}
      />
      <AppNavigator />
    </AuthPersistenceWrapper>
  );
}

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <SafeAreaProvider>
            <AppContent />
          </SafeAreaProvider>
          <Toast ref={(ref) => {}} />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
