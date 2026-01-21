import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';
import apiClient from '../../api/axios.config';

// Mock Geolocation for development - replace with real geolocation when available
const MockGeolocation = {
  watchPosition: (success: Function, error?: Function, options?: any) => {
    console.log('🎯 MockGeolocation.watchPosition called');
    let watchId = setInterval(() => {
      const mockPosition = {
        coords: {
          latitude: 18.6472 + (Math.random() - 0.5) * 0.001,
          longitude: 73.7845 + (Math.random() - 0.5) * 0.001,
          accuracy: 5 + Math.random() * 10
        }
      };
      success(mockPosition);
    }, 1000); // Update every 1 second

    return watchId;
  },
  clearWatch: (watchId: any) => {
    if (watchId) {
      clearInterval(watchId);
      console.log('🛑 MockGeolocation watch cleared');
    }
  }
};

interface GeofenceData {
  id: number;
  name: string;
  description?: string;
  polygon_json: {
    type: string;
    coordinates: number[][][];
  };
  organization: number;
  organization_name: string;
  active: boolean;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
  center_point?: any;
}

export const GeofenceMapScreen = () => {
  // ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL, BEFORE ANY CONDITIONAL LOGIC
  const navigation = useNavigation();
  const colors = useColors();

  // State hooks
  const [geofence, setGeofence] = useState<GeofenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{latitude: number, longitude: number} | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [mapKey, setMapKey] = useState<number>(0);
  const [officerLocation, setOfficerLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Ref hooks
  const webViewRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  // Callback hooks
  const startLocationTracking = useCallback(() => {
    console.log('🎯 Starting real GPS location tracking...');

    if (watchIdRef.current !== null) {
      // Already watching, don't start another
      return;
    }

    // Configure geolocation options for frequent updates
    const geolocationOptions = {
      enableHighAccuracy: true, // Use GPS for better accuracy
      timeout: 15000, // 15 seconds timeout
      maximumAge: 1000, // Accept locations up to 1 second old
      distanceFilter: 1, // Update when moved at least 1 meter
    };

    // Start watching position with mock implementation
    watchIdRef.current = MockGeolocation.watchPosition(
      (position: any) => {
        const { latitude, longitude, accuracy } = position.coords;

        // Update officer location state (only for UI, not map re-rendering)
        setOfficerLocation({ latitude, longitude });
        setLocationError(null);

        // Log occasional updates to reduce console spam
        console.log(`📍 Officer location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (accuracy: ${accuracy}m)`);

        // Send location to backend (when API is ready)
        sendLocationToBackend(latitude, longitude);
      },
      (error: any) => {
        console.error('❌ MockGeolocation error:', error);
        setLocationError(`Location error: ${error.message}`);
      }
    );

    console.log('✅ Mock location tracking started with watchId:', watchIdRef.current);

    // Return cleanup function
    return () => {
      if (watchIdRef.current !== null) {
        MockGeolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        console.log('🛑 Location tracking stopped');
      }
    };
  }, []);

  // Effect hooks
  useEffect(() => {
    fetchGeofence();
  }, []);

  useEffect(() => {
    if (geofence && watchIdRef.current === null) {
      const cleanup = startLocationTracking();
      return cleanup; // Return cleanup function
    }
  }, [geofence, startLocationTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        MockGeolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (officerLocation && webViewRef.current) {
      const message = JSON.stringify({
        type: 'updateOfficerMarker',
        latitude: officerLocation.latitude,
        longitude: officerLocation.longitude,
      });
      webViewRef.current.postMessage(message);
    }
  }, [officerLocation]);

  // ===== HELPER FUNCTIONS =====
  // These must be defined before useMemo hooks that reference them

  // Calculate center point of geofence
  const getGeofenceCenter = () => {
    if (!geofence?.polygon_json?.coordinates?.[0]) {
      console.log('Using default center - no geofence coordinates');
      return { latitude: 18.6472, longitude: 73.7845 }; // Default to Pune area
    }

    try {
      const coordinates = geofence.polygon_json.coordinates[0];

      if (!Array.isArray(coordinates) || coordinates.length === 0) {
        console.warn('Invalid coordinates array:', coordinates);
        return { latitude: 18.6472, longitude: 73.7845 };
      }

      let latSum = 0, lngSum = 0;
      let validCoords = 0;

      coordinates.forEach((coord: number[]) => {
        if (Array.isArray(coord) && coord.length >= 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          lngSum += coord[0]; // longitude
          latSum += coord[1]; // latitude
          validCoords++;
        }
      });

      if (validCoords === 0) {
        console.warn('No valid coordinates found');
        return { latitude: 18.6472, longitude: 73.7845 };
      }

      const center = {
        latitude: latSum / validCoords,
        longitude: lngSum / validCoords,
      };

      console.log('Calculated geofence center:', center);
      return center;
    } catch (error) {
      console.error('Error calculating geofence center:', error);
      return { latitude: 18.6472, longitude: 73.7845 };
    }
  };

  // Get geofence coordinates for display
  const getGeofenceCoordinates = () => {
    if (!geofence?.polygon_json?.coordinates?.[0]) {
      console.log('No geofence coordinates found');
      return [];
    }

    try {
      const coords = geofence.polygon_json.coordinates[0];
      console.log('Processing geofence coordinates:', coords);

      if (!Array.isArray(coords) || coords.length < 3) {
        console.warn('Invalid geofence coordinates:', coords);
        return [];
      }

      const processedCoords = coords.map((coord: number[], index: number) => {
        if (!Array.isArray(coord) || coord.length < 2) {
          console.warn('Invalid coordinate at index', index, ':', coord);
          return null;
        }

        return {
          id: index + 1,
          latitude: coord[1], // GeoJSON: [lng, lat]
          longitude: coord[0],
          label: `Point ${index + 1}`
        };
      }).filter(coord => coord !== null);

      console.log('Processed coordinates:', processedCoords);
      return processedCoords;
    } catch (error) {
      console.error('Error processing geofence coordinates:', error);
      return [];
    }
  };

  // Calculate appropriate zoom level based on geofence size
  const getOptimalZoom = () => {
    const coords = getGeofenceCoordinates(); // Use local calculation, not memoized version
    if (!coords || coords.length < 3) return 15;

    // Calculate bounding box
    let minLat = coords[0].latitude;
    let maxLat = coords[0].latitude;
    let minLng = coords[0].longitude;
    let maxLng = coords[0].longitude;

    coords.forEach(coord => {
      minLat = Math.min(minLat, coord.latitude);
      maxLat = Math.max(maxLat, coord.latitude);
      minLng = Math.min(minLng, coord.longitude);
      maxLng = Math.max(maxLng, coord.longitude);
    });

    // Calculate diagonal distance in degrees (rough approximation)
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const diagonal = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Adjust zoom based on geofence size
    // Smaller geofence = higher zoom, larger geofence = lower zoom
    if (diagonal < 0.001) return 17; // Very small area (< 100m)
    if (diagonal < 0.005) return 16; // Small area (< 500m)
    if (diagonal < 0.01) return 15;  // Medium area (< 1km)
    if (diagonal < 0.02) return 14;  // Large area (< 2km)
    return 13; // Very large area (> 2km)
  };

  // Memo hooks (now can reference the helper functions defined above)
  const geofenceCenter = useMemo(() => getGeofenceCenter(), [geofence]);
  const coordinates = useMemo(() => getGeofenceCoordinates(), [geofence]);
  const optimalZoom = useMemo(() => getOptimalZoom(), [coordinates]);

  // Function to center map on geofence area
  const centerOnGeofence = () => {
    // Force component remount with new center/zoom values
    setMapKey(prev => prev + 1);
    setMapCenter(geofenceCenter);
    setMapZoom(optimalZoom);
  };

  // Default map center (general city view) - not automatically centered on geofence
  const defaultCenter = { latitude: 18.6472, longitude: 73.7845 }; // General Pune area
  const defaultZoom = 12; // City-level zoom

  // Use dynamic center/zoom if set by pin button, otherwise use default general view
  const currentCenter = mapCenter || defaultCenter;
  const currentZoom = mapZoom || defaultZoom;

  // Debug logging
  console.log('GeofenceMapScreen render:', {
    geofence: geofence ? 'loaded' : 'null',
    coordinates: coordinates?.length || 0,
    currentCenter,
    currentZoom,
    officerLocation: officerLocation ? 'set' : 'null'
  });

  const fetchGeofence = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/geofence/');

      // Handle API response - check if geofence exists
      console.log('Geofence API response:', response.data);

      if (response.data && response.data.data === null) {
        // No geofence assigned - this is now a 200 response with empty data
        console.log('No geofence assigned to officer');
        setGeofence(null);
      } else if (response.data && response.data.polygon_json) {
        // Geofence data exists
        console.log('Geofence data loaded:', response.data);
        console.log('Polygon coordinates:', response.data.polygon_json?.coordinates);
        setGeofence(response.data);
      } else {
        // Fallback for unexpected response format
        console.warn('Unexpected geofence API response format:', response);
        setGeofence(null);
      }
    } catch (error: any) {
      console.error('Error fetching geofence:', error);
      let errorMessage = 'Unable to load geofence data';

      if (error.response?.status === 500) {
        errorMessage = 'Server temporarily unavailable. Please try again later.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Geofence service not available.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error.code === 'NETWORK_ERROR' || !error.response) {
        errorMessage = 'Network connection issue. Check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      // Set geofence to null so the UI shows fallback state
      setGeofence(null);
    } finally {
      setLoading(false);
    }
  };

  // Location tracking functions with simulated 1-second updates

  // Send officer location to backend
  const sendLocationToBackend = async (latitude: number, longitude: number) => {
    try {
      // TODO: Create API endpoint /api/officer/location/ for live location updates
      // await apiClient.post('/officer/location/', {
      //   latitude,
      //   longitude,
      //   accuracy: position.coords.accuracy,
      //   speed: position.coords.speed,
      //   timestamp: new Date().toISOString(),
      // });

      console.log('📡 Live location update:', {
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send location to backend:', error);
      // Don't show error to user for location updates to avoid spam
    }
  };

  // ===== CONDITIONAL EARLY RETURNS =====
  // These come AFTER all hooks and helper functions

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.darkText }]}>Loading geofence...</Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, opacity: 0.7, color: colors.darkText }]}>
          Fetching assigned security area
        </Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <Icon name="location-off" size={48} color={colors.emergencyRed} />
        <Text style={[styles.errorText, { color: colors.emergencyRed }]}>Geofence Error</Text>
        <Text style={[styles.errorDescription, { color: colors.mediumText }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchGeofence}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show no geofence assigned state
  if (geofence === null && !loading && !error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
        <Icon name="location-off" size={48} color={colors.mediumText} />
        <Text style={[styles.errorText, { color: colors.darkText }]}>No Geofence Assigned</Text>
        <Text style={[styles.errorDescription, { color: colors.mediumText }]}>
          No security patrol area has been assigned to your account yet.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={fetchGeofence}
          activeOpacity={0.7}
        >
          <Text style={[styles.retryButtonText, { color: colors.white }]}>Check Again</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Icon name="map" size={28} color={colors.primary} style={styles.titleIcon} />
          <Text style={[styles.title, { color: colors.darkText }]}>Geofence Map</Text>
        </View>
      </View>

      {/* Map Section (70% of screen) */}
      <View style={styles.mapSection}>
        <LeafletMap
          forwardedRef={webViewRef}
          key={`map-geofence-${geofence?.id || 'no-geofence'}`}
          latitude={currentCenter.latitude}
          longitude={currentCenter.longitude}
          zoom={currentZoom}
          height={400}
          markerTitle={geofence?.name || "Security Area"}
          polygonCoordinates={coordinates && coordinates.length >= 3 ? coordinates.map(coord => ({
            latitude: coord.latitude,
            longitude: coord.longitude
          })) : undefined}
        />

        {/* Floating Action Button - Top Right */}
        <View style={[styles.fabContainer, styles.fabTopRight]}>
          <TouchableOpacity
            style={[styles.centerButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
            onPress={centerOnGeofence}
            activeOpacity={0.7}
          >
            <Icon name="my-location" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Details Section (20% of screen) */}
      <View style={[styles.detailsSection, { backgroundColor: colors.white }]}>
        <View style={styles.sectionHeader}>
          <Icon name="info" size={20} color={colors.primary} style={styles.sectionIcon} />
          <Text style={[styles.sectionTitle, { color: colors.darkText }]}>Geofence Details</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mediumText }]}>Name:</Text>
          <Text style={[styles.detailValue, { color: colors.darkText }]}>{geofence?.name || 'Unnamed Geofence'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mediumText }]}>Location:</Text>
          <Text style={[styles.detailValue, { color: colors.darkText }]}>
            {geofenceCenter.latitude.toFixed(4)}, {geofenceCenter.longitude.toFixed(4)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mediumText }]}>Organization:</Text>
          <Text style={[styles.detailValue, { color: colors.darkText }]}>
            {geofence?.organization_name || 'Unknown'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.mediumText }]}>Created:</Text>
          <Text style={[styles.detailValue, { color: colors.darkText }]}>
            {geofence?.created_at ? new Date(geofence.created_at).toLocaleDateString() : 'Unknown'}
          </Text>
        </View>
      </View>

    </View>
  );
};

// Note: Colors are applied inline using useColors() hook
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenMap: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.screenHeader,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorDescription: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.buttonSmall,
    fontWeight: '600',
  },
  mapSection: {
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  detailsSection: {
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    marginBottom: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    marginHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleIcon: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.screenHeader,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
  },
  mapContainer: {
    marginBottom: spacing.lg,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    marginHorizontal: spacing.sm,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  mapHeaderText: {
    ...typography.body,
    fontWeight: '700',
    marginLeft: spacing.xs,
    color: '#007AFF',
  },
  mapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoContainer: {
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  centeredTitleRow: {
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 4,
  },
  centeredTitle: {
    ...typography.sectionHeader,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  infoLabel: {
    ...typography.body,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    paddingTop: 50, // Account for status bar
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  fabTopRight: {
    top: 20,
    right: 20,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 30, // Account for home indicator
  },
  panelContent: {
    flexDirection: 'column',
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  panelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  panelLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#e2e8f0',
  },
  panelValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: '#007AFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  sectionIcon: {
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
    marginBottom: 4,
  },
  detailLabel: {
    ...typography.body,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

export default GeofenceMapScreen;
