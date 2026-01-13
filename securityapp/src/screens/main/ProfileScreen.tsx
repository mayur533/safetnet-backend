import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { typography, spacing, shadows } from '../../utils';
import { MOCK_OFFICERS } from '../../utils/mockData';

export const ProfileScreen = () => {
  // Use mock officer data
  const officer = MOCK_OFFICERS['BADGE001'].officer;

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
    Alert.alert('Edit Profile', 'Profile editing feature coming soon!');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profilePictureContainer}>
          <View style={styles.profilePicture}>
            <Text style={styles.profilePictureText}>
              {officer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.profileName}>{officer.name}</Text>
        <Text style={styles.profileId}>ID: {officer.security_id}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{officer.security_role}</Text>
        </View>
      </View>

      {/* Stats Container */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.total_responses || 0}</Text>
          <Text style={styles.statLabel}>Responses</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.avg_response_time || 0}m</Text>
          <Text style={styles.statLabel}>Avg. Response</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{officer.stats?.active_hours || 0}h</Text>
          <Text style={styles.statLabel}>Active Hours</Text>
        </View>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Contact Information</Text>
            <TouchableOpacity style={styles.cardHeaderRight} onPress={handleEditProfile}>
              <Icon name="edit" size={20} color={colors.primary} />
              <Text style={styles.cardSubtitle}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.body}>Email: {officer.email_id}</Text>
          <Text style={styles.body}>Mobile: {officer.mobile}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Work Details</Text>
            <TouchableOpacity style={styles.cardHeaderRight} onPress={handleEditProfile}>
              <Icon name="edit" size={20} color={colors.primary} />
              <Text style={styles.cardSubtitle}>Edit</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.body}>Badge Number: {officer.badge_number}</Text>
          <Text style={styles.body}>Shift: {officer.shift_schedule || 'Day Shift'}</Text>
          <Text style={styles.body}>Geofence: {officer.geofence_name || officer.geofence_id}</Text>
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
          <Text style={styles.body}>Last updated: {new Date().toLocaleDateString()}</Text>
        </View>
      </View>

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