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
import { geofenceService, locationService, LocationData, LiveLocationSession } from '../../api/services/geofenceService';
import { Alert } from '../../types/alert.types';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { formatExactTime } from '../../utils/helpers';
import LeafletMap from '../../components/maps/LeafletMap';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type AlertRespondMapScreenParams = {
  alertId: string;
};

type AlertRespondMapScreenRouteProp = RouteProp<Record<string, AlertRespondMapScreenParams>, string>;

export const AlertRespondMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<AlertRespondMapScreenRouteProp>();
  const { alertId } = route.params || {};

  const { resolveAlert } = useAlertsStore();
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
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle accept button press
  const handleAccept = async () => {
    if (!alert) return;

    RNAlert.alert(
      'Accept Alert Response',
      `Are you sure you want to accept and respond to this ${alert.alert_type} alert? This will start live location tracking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Respond',
          style: 'default',
          onPress: async () => {
            await acceptAlertResponse();
          },
        },
      ]
    );
  };

  // Accept alert response
  const acceptAlertResponse = async () => {
    if (!alert) return;

    try {
      setIsAccepting(true);
      console.log('📞 Accepting alert response for ID:', alert.id);

      // Resolve/accept the alert response
      await resolveAlert(alert.id);

      // Start live location session
      await startLiveLocationSession();

      console.log('✅ Alert response accepted successfully');

      RNAlert.alert(
        'Response Accepted',
        'You are now responding to this alert. Live location tracking has started.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
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
      (position) => {
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
      (error) => {
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
  const hasCoordinates = alert.location?.latitude && alert.location?.longitude;

  // Prepare map markers
  const markers = [];

  // Alert location marker
  if (hasCoordinates) {
    markers.push({
      id: `alert-${alert.id}`,
      latitude: alert.location.latitude,
      longitude: alert.location.longitude,
      title: `${alert.alert_type.toUpperCase()} Alert`,
      description: alert.message,
      icon: alert.alert_type === 'emergency' ? 'warning' : 'notification-important'
    });
  }

  // Officer location marker
  if (officerLocation) {
    markers.push({
      id: 'officer',
      latitude: officerLocation.latitude,
      longitude: officerLocation.longitude,
      title: 'Your Location',
      description: `Accuracy: ±${officerLocation.accuracy?.toFixed(1) || 'N/A'}m`,
      icon: 'person'
    });
  }

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
          <LeafletMap
            latitude={alert.location.latitude}
            longitude={alert.location.longitude}
            zoom={15}
            height={screenHeight * 0.5}
            markers={markers}
            showGeofenceCenter={false}
          />
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
          onPress={handleAccept}
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
});