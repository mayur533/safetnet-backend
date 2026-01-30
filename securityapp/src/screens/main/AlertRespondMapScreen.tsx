import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAlertsStore } from '../../store/alertsStore';
import { useGeofenceStore } from '../../store/geofenceStore';
import { alertService } from '../../api/services/alertService';
import { geofenceService, locationService, LiveLocationSession } from '../../api/services/geofenceService';
import { Alert } from '../../types/alert.types';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { formatExactTime } from '../../utils/helpers';
import { LeafletMap } from '../../components/maps/LeafletMap';

// Define LocationData interface
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string; // Optional timestamp for location updates
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type AlertRespondMapScreenParams = {
  alertId: string;
};

type AlertRespondMapScreenRouteProp = RouteProp<Record<string, AlertRespondMapScreenParams>, string>;

export const AlertRespondMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<AlertRespondMapScreenRouteProp>();
  const { alertId } = route.params || {};

  const { resolveAlert, updateAlert: storeUpdateAlert } = useAlertsStore();
  const { updateLocation } = useGeofenceStore();

  // State
  const [alert, setAlert] = useState<Alert | null>(null);
  const [officerLocation, setOfficerLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live location session state
  const [liveSession, setLiveSession] = useState<LiveLocationSession | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  // Refs for cleanup
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch alert details
  useEffect(() => {
    if (!alertId) {
      setError('No alert ID provided');
      setIsLoading(false);
      return;
    }

    const fetchAlert = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('📡 Fetching alert details for ID:', alertId);
        const alertData = await alertService.getAlertById(alertId);
        setAlert(alertData);

        console.log('✅ Alert details fetched:', alertData);
        console.log('📍 Alert location data:', {
          location: alertData.location,
          latitude: alertData.location?.latitude,
          longitude: alertData.location?.longitude,
          hasCoordinates: !!(alertData.location?.latitude && alertData.location?.longitude)
        });
        console.log('🗺️ Full alert object:', JSON.stringify(alertData, null, 2));
      } catch (error: any) {
        console.error('❌ Failed to fetch alert details:', error);
        setError(error.message || 'Failed to load alert details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  // Get current officer location
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        console.log('📍 Getting current officer location...');
        const location = await locationService.getCurrentLocation();
        setOfficerLocation(location);
        console.log('✅ Officer location obtained:', location);
      } catch (error: any) {
        console.error('❌ Failed to get officer location:', error);
        // Don't set error state for location - it's not critical
        // Use default location if GPS fails
        setOfficerLocation({
          latitude: 18.6472,
          longitude: 73.7845,
          accuracy: 100
        });
      }
    };

    getCurrentLocation();
  }, []);

  // Handle accept alert - no confirmation needed
  const handleAcceptAlert = async () => {
    await acceptAlertResponse();
  };

  // Accept alert response
  const acceptAlertResponse = async () => {
    if (!alert) return;

    try {
      setIsAccepting(true);
      console.log('📞 Accepting alert response for ID:', alert.id);

      // Change status to 'accepted' instead of 'completed'
      await storeUpdateAlert(alert.id, { status: 'accepted' });

      // Start live location session
      await startLiveLocationSession();

      console.log('✅ Alert response accepted successfully - Status changed to "accepted"');

      RNAlert.alert(
        'Response Accepted',
        'You are now responding to this alert. The alert has been moved to the Accepted section.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error: any) {
      console.error('❌ Failed to accept alert response:', error);
      RNAlert.alert('Error', error.message || 'Failed to accept alert response');
    } finally {
      setIsAccepting(false);
    }
  };

  // Start live location session
  const startLiveLocationSession = async () => {
    try {
      console.log('📍 Starting live location session...');

      // Get assigned geofence for the session
      const assignedGeofence = await geofenceService.getAssignedGeofence();
      const geofenceId = assignedGeofence?.id || 'default';

      // Start session
      const session = await locationService.startLiveLocation(geofenceId);
      setLiveSession(session);
      setIsTrackingLocation(true);

      console.log('✅ Live location session started:', session.id);

      // Start location tracking with throttling
      startLocationTracking(session.id);
    } catch (error: any) {
      console.error('❌ Failed to start live location session:', error);
      // Don't throw - location tracking is not critical for alert acceptance
    }
  };

  // Start location tracking with throttling
  const startLocationTracking = (sessionId: string) => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    console.log('📡 Starting location tracking with 10-second intervals...');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position: any) => {
        const now = Date.now();

        // Throttle updates to once every 10 seconds
        if (now - lastUpdateRef.current > 10000) {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          };

          console.log('📍 Sending location update:', locationData);
          updateLocationToServer(sessionId, locationData);
          setOfficerLocation(locationData);
          lastUpdateRef.current = now;
        }
      },
      (error: any) => {
        console.error('❌ Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000
      }
    );

    // Also send updates every 10 seconds as backup
    locationIntervalRef.current = setInterval(() => {
      if (officerLocation) {
        updateLocationToServer(sessionId, officerLocation);
      }
    }, 10000);
  };

  // Update location to server
  const updateLocationToServer = async (sessionId: string, locationData: LocationData) => {
    try {
      await locationService.updateLiveLocation(sessionId, locationData);
      // Also update geofence store for boundary detection
      updateLocation(locationData.latitude, locationData.longitude);
    } catch (error: any) {
      console.error('❌ Failed to update location:', error);
      // Don't throw - silent failure for location updates
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop location tracking
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      // Clear interval
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }

      // Stop live location session if active
      if (liveSession && isTrackingLocation) {
        locationService.stopLiveLocation(liveSession.id).catch(console.error);
      }
    };
  }, [liveSession, isTrackingLocation]);

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading alert details...</Text>
      </View>
    );
  }

  // Error state
  if (error || !alert) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error" size={48} color={colors.emergencyRed} />
        <Text style={styles.errorText}>{error || 'Alert not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if alert has coordinates
  const hasCoordinates = alert?.location?.latitude && alert?.location?.longitude;

  // Get geofence coordinates for the map
  const getGeofenceCoordinates = () => {
    if (!alert?.geofence) return null;

    const geofence = alert.geofence;
    if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      // Parse polygon coordinates
      try {
        const polygon = JSON.parse(geofence.polygon_json);
        if (polygon.type === 'Polygon' && polygon.coordinates && polygon.coordinates[0]) {
          return polygon.coordinates[0].map((coord: number[]) => ({
            latitude: coord[1], // GeoJSON is [longitude, latitude]
            longitude: coord[0]
          }));
        }
      } catch (error) {
        console.error('Error parsing polygon coordinates:', error);
      }
    } else if (geofence.geofence_type === 'circle') {
      // Create a circle approximation using polygon points
      const centerLat = geofence.center_latitude;
      const centerLng = geofence.center_longitude;
      const radius = geofence.radius || 1000; // Default 1km
      const points = [];
      const sides = 32; // Number of points to approximate circle
      
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * 2 * Math.PI;
        const lat = centerLat + (radius / 111320) * Math.cos(angle); // Approximate conversion
        const lng = centerLng + (radius / (111320 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
        points.push({ latitude: lat, longitude: lng });
      }
      
      return points;
    }
    
    return null;
  };

  const geofenceCoordinates = getGeofenceCoordinates();

  console.log('🗺️ Geofence Debug Info:');
  console.log('   Alert geofence:', alert?.geofence);
  console.log('   Geofence coordinates:', geofenceCoordinates);
  console.log('   Has coordinates:', hasCoordinates);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Respond to Alert</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Alert Info */}
      <View style={styles.alertInfo}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTypeContainer}>
            <Icon
              name={alert.alert_type === 'emergency' ? 'warning' : 'notification-important'}
              size={20}
              color={alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warningOrange}
            />
            <Text style={[
              styles.alertType,
              { color: alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warningOrange }
            ]}>
              {alert.alert_type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.alertTime}>
            {formatExactTime(alert.timestamp)}
          </Text>
        </View>

        <Text style={styles.alertMessage}>{alert.message}</Text>

        {alert.description && (
          <Text style={styles.alertDescription}>{alert.description}</Text>
        )}

        <View style={styles.alertMeta}>
          <Text style={styles.alertMetaText}>
            Status: <Text style={styles.alertMetaValue}>{alert.status || 'pending'}</Text>
          </Text>
          {alert.user_name && (
            <Text style={styles.alertMetaText}>
              From: <Text style={styles.alertMetaValue}>{alert.user_name}</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {hasCoordinates ? (
          <>
            {/* Location Info Bar */}
            <View style={styles.locationInfoBar}>
              <Icon name="location-on" size={16} color={colors.primary} />
              <Text style={styles.locationInfoText}>
                {alert.location.latitude.toFixed(6)}, {alert.location.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationAccuracyText}>
                GPS: ±10m accuracy
              </Text>
            </View>
            
            <LeafletMap
              latitude={alert.location.latitude}
              longitude={alert.location.longitude}
              zoom={18} // Very high zoom for street-level precision
              height={screenHeight * 0.45} // Adjust height for info bar
              showMarker={true}
              markerTitle={`${alert.alert_type?.toUpperCase() || 'ALERT'}: ${alert.message?.substring(0, 30) || 'Location'}`}
              polygonCoordinates={geofenceCoordinates}
              mapKey={`alert-${alert.id}-${Date.now()}`} // Force re-render
            />
            
            {/* Debug coordinates overlay */}
            <View style={styles.debugOverlay}>
              <Text style={styles.debugText}>
                📍 LAT: {alert.location.latitude.toFixed(8)}
              </Text>
              <Text style={styles.debugText}>
                📍 LNG: {alert.location.longitude.toFixed(8)}
              </Text>
              <Text style={styles.debugText}>
                🗺️ ZOOM: 18 (Street Level)
              </Text>
              <Text style={styles.debugText}>
                🎯 MAP: {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
              </Text>
            </View>
          </>
        ) : (
          <View style={[styles.mapPlaceholder, styles.centered]}>
            <Icon name="location-off" size={48} color={colors.mediumText} />
            <Text style={styles.mapPlaceholderText}>
              No location coordinates available for this alert
            </Text>
          </View>
        )}
      </View>

      {/* Accept Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptButton, isAccepting && styles.acceptButtonDisabled]}
          onPress={handleAcceptAlert}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Icon name="check-circle" size={24} color={colors.white} />
              <Text style={styles.acceptButtonText}>Accept & Respond</Text>
            </>
          )}
        </TouchableOpacity>

        {isTrackingLocation && (
          <View style={styles.trackingIndicator}>
            <Icon name="gps-fixed" size={16} color={colors.successGreen} />
            <Text style={styles.trackingText}>Live location tracking active</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
  },
  placeholder: {
    width: 40,
  },
  alertInfo: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertType: {
    ...typography.caption,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  alertTime: {
    ...typography.caption,
    color: colors.mediumText,
  },
  alertMessage: {
    ...typography.body,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  alertDescription: {
    ...typography.body,
    color: colors.darkText,
    marginBottom: spacing.sm,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertMetaText: {
    ...typography.caption,
    color: colors.mediumText,
  },
  alertMetaValue: {
    ...typography.caption,
    color: colors.darkText,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPlaceholder: {
    height: screenHeight * 0.5,
    backgroundColor: colors.lightGrayBg,
    borderRadius: 12,
  },
  mapPlaceholderText: {
    ...typography.body,
    color: colors.mediumText,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successGreen,
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonDisabled: {
    backgroundColor: colors.mediumText,
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  trackingText: {
    ...typography.caption,
    color: colors.successGreen,
    marginLeft: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.mediumText,
  },
  errorText: {
    ...typography.body,
    color: colors.emergencyRed,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  // Location info styles
  locationInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  locationInfoText: {
    ...typography.caption,
    color: colors.darkText,
    marginLeft: spacing.xs,
    flex: 1,
    fontFamily: 'monospace',
  },
  locationAccuracyText: {
    ...typography.caption,
    color: colors.mediumText,
    fontSize: 10,
  },
  // Debug overlay styles
  debugOverlay: {
    position: 'absolute',
    top: 100,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: spacing.xs,
    borderRadius: 4,
    zIndex: 1000,
  },
  debugText: {
    ...typography.caption,
    color: colors.white,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});