/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect, useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StatusBar, StyleSheet, useColorScheme, Platform, PermissionsAndroid} from 'react-native';
import {SafeGestureHandlerRootView} from './src/utils/gestureHandlerFallback';
import {useAuthStore} from './src/stores/authStore';
import {useSettingsStore} from './src/stores/settingsStore';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import {LightAppTheme, DarkAppTheme} from './src/theme/navigationThemes';

function App(): React.JSX.Element {
  // Always call hooks in the same order (before any conditional logic)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadAuth = useAuthStore((state) => state.load);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const systemScheme = useColorScheme();

  useEffect(() => {
    // Load auth state on app start to restore session
    loadAuth().catch((error) => {
      console.error('Error loading auth state:', error);
    });
    loadSettings().catch((error) => {
      console.error('Error loading settings:', error);
    });

    // Request permissions after app is mounted and ready
    if (Platform.OS === 'android') {
      // Use setTimeout to ensure the app is fully attached to Activity
      const requestPermissions = async () => {
        try {
          // Wait a bit to ensure Activity is ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const permissions = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            PermissionsAndroid.PERMISSIONS.SEND_SMS,
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          ];

          // Add storage permissions based on Android version
          if (Platform.Version < 33) {
            permissions.push(
              PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
          }

          // Request all permissions - Android system will show dialogs automatically
          await PermissionsAndroid.requestMultiple(permissions);
        } catch (error) {
          console.warn('Permission request error:', error);
        }
      };
      requestPermissions();
    }
  }, [loadAuth, loadSettings]);

  const resolvedScheme = themeMode === 'system' ? systemScheme ?? 'light' : themeMode;

  const navigationTheme = useMemo(
    () => (resolvedScheme === 'dark' ? DarkAppTheme : LightAppTheme),
    [resolvedScheme],
  );

  const statusBarStyle = resolvedScheme === 'dark' ? 'light-content' : 'dark-content';

  return (
    <SafeGestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={navigationTheme.colors.background} />
          {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </SafeAreaProvider>
    </SafeGestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
