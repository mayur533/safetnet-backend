import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors } from '../../utils/colors';

export const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { officer } = useAppSelector((state) => state.auth);

  if (!officer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Profile not available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {officer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{officer.name}</Text>
          <Text style={styles.roleText}>{officer.security_role}</Text>
          <Text style={styles.idText}>ID: {officer.security_id}</Text>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email:</Text>
          <Text style={styles.detailValue}>{officer.email_id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Mobile:</Text>
          <Text style={styles.detailValue}>{officer.mobile || 'Not provided'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Geofence:</Text>
          <Text style={styles.detailValue}>{officer.geofence_id}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, styles.statusText, officer.status === 'active' ? styles.activeStatus : styles.inactiveStatus]}>
            {officer.status}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: colors.lightGrayBg,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  infoContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: colors.mediumGray,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  idText: {
    fontSize: 14,
    color: colors.mediumGray,
  },
  detailsContainer: {
    paddingHorizontal: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
  },
  detailValue: {
    fontSize: 16,
    color: colors.mediumGray,
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activeStatus: {
    color: colors.successGreen,
  },
  inactiveStatus: {
    color: colors.emergencyRed,
  },
  buttonContainer: {
    padding: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});