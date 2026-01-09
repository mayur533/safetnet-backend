import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/colors';

const SOSPage = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SOS Emergency</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sosContainer}>
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosSubtitle}>Emergency Response System</Text>
        </View>

        <Text style={styles.description}>
          This page will contain emergency alert functionality, live location sharing, and emergency contact features.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    backgroundColor: colors.emergencyRed,
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  sosText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.emergencyRed,
    marginBottom: 10,
  },
  sosSubtitle: {
    fontSize: 16,
    color: colors.mediumGray,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.darkText,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SOSPage;