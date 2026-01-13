import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const GeofenceMapScreen = ({ navigation }: any) => {
  // Dummy coordinates for demonstration (can be replaced with real geofence data)
  const geofenceCenter = {
    latitude: 37.7749,  // San Francisco coordinates as example
    longitude: -122.4194,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Geofence Map</Text>
        <Text style={styles.subtitle}>
          Monitor and manage geofenced security areas
        </Text>
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          latitude={geofenceCenter.latitude}
          longitude={geofenceCenter.longitude}
          zoom={16}
          height={400}
          markerTitle="Security Facility"
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Geofence Information</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Center Location:</Text>
          <Text style={styles.infoValue}>
            {geofenceCenter.latitude.toFixed(6)}, {geofenceCenter.longitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>Active</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Monitored Area:</Text>
          <Text style={styles.infoValue}>500m radius</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typography.screenHeader,
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.mediumText,
    textAlign: 'center',
  },
  mapContainer: {
    marginBottom: spacing.lg,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    ...typography.sectionHeader,
    color: colors.darkText,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.body,
    color: colors.mediumText,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.darkText,
    fontWeight: '600',
  },
});

export default GeofenceMapScreen;
