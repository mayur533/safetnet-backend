import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LeafletMap } from '../components/maps/LeafletMap';
import { colors } from '../utils/colors';
import { typography, spacing } from '../utils';

type LeafletMapScreenParams = {
  latitude?: number;
  longitude?: number;
  zoom?: number;
  markerTitle?: string;
};

type LeafletMapScreenRouteProp = RouteProp<Record<string, LeafletMapScreenParams>, string>;

const LeafletMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<LeafletMapScreenRouteProp>();

  // Get coordinates from route params or use defaults
  const latitude = route.params?.latitude || 37.7749; // San Francisco
  const longitude = route.params?.longitude || -122.4194;
  const zoom = route.params?.zoom || 15;
  const markerTitle = route.params?.markerTitle || 'Location';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Map View</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <LeafletMap
          latitude={latitude}
          longitude={longitude}
          zoom={zoom}
          height={600} // Full screen height
          markerTitle={markerTitle}
        />
      </View>

      {/* Map Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.7}
          onPress={() => {
            // Could implement zoom in functionality
            console.log('Zoom in');
          }}
        >
          <Icon name="add" size={24} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.7}
          onPress={() => {
            // Could implement zoom out functionality
            console.log('Zoom out');
          }}
        >
          <Icon name="remove" size={24} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          activeOpacity={0.7}
          onPress={() => {
            // Could implement location reset functionality
            console.log('Reset to current location');
          }}
        >
          <Icon name="my-location" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <Text style={styles.infoTitle}>{markerTitle}</Text>
        <Text style={styles.coordinates}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
        <Text style={styles.zoomLevel}>Zoom: {zoom}x</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: 50, // Account for status bar
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.white,
    fontWeight: '600',
  },
  placeholder: {
    width: 40, // Match back button width
  },
  mapContainer: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
  controlsContainer: {
    position: 'absolute',
    right: spacing.md,
    top: 120, // Below header
    gap: spacing.sm,
  },
  controlButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  infoPanel: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
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
    marginBottom: spacing.xs,
  },
  coordinates: {
    ...typography.caption,
    color: colors.mediumText,
    fontFamily: 'monospace',
    marginBottom: spacing.xs,
  },
  zoomLevel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
});

export default LeafletMapScreen;