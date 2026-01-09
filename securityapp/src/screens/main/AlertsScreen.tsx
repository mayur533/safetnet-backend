import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/colors';

export const AlertsScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>No active alerts</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    color: colors.mediumGray,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
  },
});