import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { colors } from '../../utils/colors';
import { authService } from '../../api/services';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { officer, isAuthenticated } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout(officer?.security_id || '', officer?.security_role || '');
              dispatch(logout());
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              dispatch(logout());
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated || !officer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Not authenticated</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.nameText}>{officer.name}</Text>
        <Text style={styles.roleText}>
          {officer.security_role} • ID: {officer.security_id}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Active Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Total Cases</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Response Time</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Alerts')}
        >
          <Text style={styles.menuItemText}>📢 View Alerts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.menuItemText}>👤 My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('GeofenceArea')}
        >
          <Text style={styles.menuItemText}>🗺️ Geofence Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Broadcast')}
        >
          <Text style={styles.menuItemText}>📡 Broadcast Alert</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.menuItemText}>⚙️ Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('SOS')}
        >
          <Text style={styles.menuItemText}>🚨 SOS Emergency</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  errorText: {
    fontSize: 18,
    color: colors.emergencyRed,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: colors.white,
    opacity: 0.8,
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 4,
  },
  roleText: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: colors.lightGrayBg,
    padding: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.mediumGray,
    marginTop: 4,
    textAlign: 'center',
  },
  menuContainer: {
    padding: 20,
  },
  menuItem: {
    backgroundColor: colors.lightGrayBg,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  menuItemText: {
    fontSize: 16,
    color: colors.darkText,
    fontWeight: '500',
  },
  logoutContainer: {
    padding: 20,
  },
  logoutButton: {
    backgroundColor: colors.emergencyRed,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});