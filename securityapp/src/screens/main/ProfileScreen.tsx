import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { typography, spacing, shadows } from '../../utils';
import { profileService } from '../../api/services/profileService';
import { SecurityOfficer } from '../../types/user.types';
export const ProfileScreen = () => {
  const navigation = useNavigation();
  const [officer, setOfficer] = useState<SecurityOfficer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch profile data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 ProfileScreen focused, fetching fresh data...');
      fetchProfile();
    }, [])
  );

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Fetching profile data...');
      const profileData = await profileService.getProfile('');
      console.log('✅ Profile data loaded:', profileData);
      setOfficer(profileData);
    } catch (error: any) {
      console.error('❌ Failed to fetch profile:', error);
      setError(error.message || 'Failed to load profile');
      // Set a default officer object to prevent crashes
      setOfficer({
        security_id: 'N/A',
        name: 'Unknown Officer',
        email_id: 'N/A',
        mobile: '',
        security_role: 'guard',
        geofence_id: '',
        status: 'active',
        badge_number: 'N/A',
        shift_schedule: 'Day Shift',
        stats: {
          total_responses: 0,
          avg_response_time: 0,
          active_hours: 0,
          area_coverage: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Success', 'Logged out successfully!');
            // In a real app, this would navigate to login screen
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    // Navigate to UpdateProfileScreen
    (navigation as any).navigate('UpdateProfile');
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error" size={48} color={colors.emergencyRed} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchProfile}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No profile data
  if (!officer) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="person" size={48} color={colors.mediumText} />
        <Text style={styles.errorText}>No profile data available</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchProfile}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureText}>
              {officer.name ? officer.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </Text>
          </View>
        </View>
        <Text style={styles.profileName}>{officer.name || 'Unknown Officer'}</Text>
        <Text style={styles.profileId}>ID: {officer.security_id}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{officer.security_role}</Text>
        </View>
      </View>

      {/* Stats Container */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.total_responses || 'N/A'}</Text>
          <Text style={styles.statLabel}>Responses</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.avg_response_time ? `${officer.stats.avg_response_time}m` : 'N/A'}</Text>
          <Text style={styles.statLabel}>Avg. Response</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.active_hours ? `${officer.stats.active_hours}h` : 'N/A'}</Text>
          <Text style={styles.statLabel}>Active Hours</Text>
        </View>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Contact Information</Text>
          </View>
          <Text style={styles.body}>Email: {officer.email_id}</Text>
          <Text style={styles.body}>Mobile: {officer.mobile}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Work Details</Text>
          </View>
          <Text style={styles.body}>Badge Number: {officer.badge_number}</Text>
          <Text style={styles.body}>Shift: {officer.shift_schedule || 'Day Shift'}</Text>
          <Text style={styles.body}>Geofence: {officer.assigned_geofence?.name || officer.geofence_name || 'Not Assigned'}</Text>
          <Text style={styles.body}>Role: {officer.security_role}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Status</Text>
            <View style={styles.cardHeaderRight}>
              <Text style={[styles.statusText, officer.status === 'active' ? styles.activeStatus : styles.inactiveStatus]}>
                {officer.status}
              </Text>
            </View>
          </View>
          <Text style={styles.body}>Member since: {officer.date_joined ? new Date(officer.date_joined).toLocaleDateString() : 'N/A'}</Text>
          <Text style={styles.body}>Last login: {officer.last_login ? new Date(officer.last_login).toLocaleDateString() : 'N/A'}</Text>
        </View>
      </View>

      {/* Update Profile Button */}
      <TouchableOpacity style={styles.updateProfileButton} onPress={handleEditProfile}>
        <Icon name="edit" size={20} color={colors.white} />
        <Text style={styles.updateProfileButtonText}>Update Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.mediumText,
  },
  errorText: {
    fontSize: 16,
    color: colors.emergencyRed,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  profileHeader: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...shadows.md,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.sm,
  },
  profilePictureText: {
    ...typography.appTitle,
    fontSize: 36,
    color: colors.primary,
  },
  profileName: {
    ...typography.screenHeader,
    color: colors.white,
    marginTop: spacing.sm,
  },
  profileId: {
    ...typography.body,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  roleBadge: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.md,
  },
  roleText: {
    ...typography.bodyMedium,
    color: colors.primary,
    textTransform: 'capitalize',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.base,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    minWidth: 90,
    ...shadows.md,
  },
  statNumber: {
    ...typography.screenHeader,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    textAlign: 'center',
  },
  cardsContainer: {
    padding: spacing.base,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.sectionHeader,
    color: colors.darkText,
  },
  cardSubtitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  body: {
    ...typography.body,
    marginBottom: spacing.xs,
  },
  statusText: {
    ...typography.bodyMedium,
    textTransform: 'capitalize',
  },
  activeStatus: {
    color: colors.successGreen,
  },
  inactiveStatus: {
    color: colors.emergencyRed,
  },
  updateProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  updateProfileButtonText: {
    ...typography.buttonMedium,
    color: colors.white,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emergencyRed,
    borderRadius: 12,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  logoutButtonText: {
    ...typography.buttonMedium,
    color: colors.white,
  },
});