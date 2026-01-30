import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  Dimensions,
  Platform,
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
  const [alertLocation, setAlertLocation] = useState<LocationData | null>(null);
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
  const mapRef = useRef<any>(null);

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
        console.log('📍 ALERT GPS:', alertData.location_lat, alertData.location_long);
        
        // Validate alert GPS coordinates
        if (!alertData.location_lat || !alertData.location_long) {
          setError('Alert has no valid GPS location');
          setIsLoading(false);
          return;
        }
        
        // Set alert location from API data
        const alertLoc: LocationData = {
          latitude: alertData.location_lat,
          longitude: alertData.location_long,
          timestamp: alertData.timestamp,
          address: alertData.location?.address || `GPS: ${alertData.location_lat.toFixed(6)}, ${alertData.location_long.toFixed(6)}`
        };
        setAlertLocation(alertLoc);
        
        console.log('✅ Alert location set:', alertLoc);
      } catch (error: any) {
        console.error('❌ Failed to fetch alert details:', error);
        setError(error.message || 'Failed to load alert details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  // GPS Validation Effect
  useEffect(() => {
    if (alertLocation && officerLocation) {
      console.log('✅ GPS VALIDATION: Both locations available');
      console.log('📍 ALERT GPS:', alertLocation.latitude, alertLocation.longitude);
      console.log('📍 OFFICER GPS:', officerLocation.latitude, officerLocation.longitude);
      
      // Validate that alert GPS is not using fallback coordinates
      if (alertLocation.latitude === 18.5204 || alertLocation.longitude === 73.8567) {
        console.error('❌ VALIDATION ERROR: Alert is using fallback coordinates!');
        setError('Alert GPS validation failed - using fallback coordinates');
      }
      
      // Calculate and log distance
      const dist = validateGPSAndCalculateDistance();
      if (dist) {
        console.log('📏 DISTANCE:', dist.meters.toFixed(2), 'meters');
      }
    } else {
      console.log('❌ GPS VALIDATION: Missing locations');
      console.log('   Alert location:', alertLocation ? '✅' : '❌');
      console.log('   Officer location:', officerLocation ? '✅' : '❌');
    }
  }, [alertLocation, officerLocation]);

  // Get current officer location and start live tracking
  useEffect(() => {
    const getCurrentLocation = async () => {
      try {
        console.log('📍 Getting current officer location...');
        
        // Use React Native's built-in geolocation directly
        const position = await new Promise<any>((resolve, reject) => {
          const RN = require('react-native');
          RN.Geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0
            }
          );
        });
        
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
          address: `OFFICER GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        };
        
        setOfficerLocation(location);
        console.log('✅ OFFICER GPS:', location.latitude, location.longitude);
        
        // Start live tracking after getting initial position
        startLiveTracking();
      } catch (error: any) {
        console.error('❌ Failed to get officer location:', error);
        setError('Unable to get officer GPS location');
      }
    };

    getCurrentLocation();
  }, []);

  // Start live officer tracking
  const startLiveTracking = () => {
    console.log('📡 Starting live officer tracking...');
    
    const RN = require('react-native');
    const watchId = RN.Geolocation.watchPosition(
      (position: any) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
          address: `OFFICER GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
        };
        
        setOfficerLocation(location);
        console.log('🔄 OFFICER GPS UPDATED:', location.latitude, location.longitude);
        
        // Update map marker
        if (mapRef.current) {
          mapRef.current.injectJavaScript(`
            if (window.updateOfficerMarker) {
              window.updateOfficerMarker(${location.latitude}, ${location.longitude});
            }
          `);
        }
      },
      (error: any) => {
        console.error('❌ Live tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Allow 5 second cache for live tracking
        distanceFilter: 5 // Update only if moved 5 meters
      }
    );
    
    watchIdRef.current = watchId;
    console.log('✅ Live tracking started with watchId:', watchId);
  };

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
      (Platform.OS === 'web' ? (globalThis as any).navigator?.geolocation.clearWatch : require('react-native').Geolocation.clearWatch)(watchIdRef.current);
    }

    console.log('📡 Starting location tracking with 10-second intervals...');

    watchIdRef.current = (Platform.OS === 'web' ? (globalThis as any).navigator?.geolocation.watchPosition : require('react-native').Geolocation.watchPosition)(
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
        const RN = require('react-native');
        RN.Geolocation.clearWatch(watchIdRef.current);
        console.log('🛑 Live tracking stopped');
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

  // Error state or missing GPS
  if (error || !alert || !alertLocation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error" size={48} color={colors.emergencyRed} />
        <Text style={styles.errorText}>{error || 'Alert has no valid GPS location'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleBack}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Validate GPS data and calculate distance
  const validateGPSAndCalculateDistance = () => {
    if (!alertLocation) {
      console.log('❌ No alert location available');
      return null;
    }
    
    if (!officerLocation) {
      console.log('❌ No officer location available');
      return null;
    }
    
    // Calculate distance using haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (officerLocation.latitude - alertLocation.latitude) * Math.PI / 180;
    const dLon = (officerLocation.longitude - alertLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(alertLocation.latitude * Math.PI / 180) * Math.cos(officerLocation.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    const distanceMeters = distanceKm * 1000;
    
    console.log('DISTANCE:', distanceMeters.toFixed(2), 'meters');
    
    return {
      kilometers: distanceKm,
      meters: distanceMeters,
      text: distanceKm < 1 ? `${Math.round(distanceMeters)}m` : `${distanceKm.toFixed(1)}km`
    };
  };
  
  const distance = validateGPSAndCalculateDistance();
  const getGeofenceCoordinates = () => {
    if (!alert?.geofence) {
      console.log('❌ No geofence data available');
      return null;
    }

    const geofence = alert.geofence;
    console.log('🔍 Processing geofence:', {
      id: geofence.id,
      type: geofence.geofence_type,
      hasPolygonJson: !!geofence.polygon_json,
      hasCenter: !!(geofence.center_latitude && geofence.center_longitude),
      radius: geofence.radius
    });

    if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      // Parse polygon coordinates
      try {
        const polygon = JSON.parse(geofence.polygon_json);
        console.log('📐 Parsed polygon:', polygon);
        
        if (polygon.type === 'Polygon' && polygon.coordinates && polygon.coordinates[0]) {
          const coords = polygon.coordinates[0].map((coord: number[]) => ({
            latitude: coord[1], // GeoJSON is [longitude, latitude]
            longitude: coord[0]
          }));
          console.log('✅ Polygon coordinates extracted:', coords.length, 'points');
          return coords;
        } else {
          console.log('❌ Invalid polygon structure');
        }
      } catch (error) {
        console.error('❌ Error parsing polygon coordinates:', error);
      }
    } else if (geofence.geofence_type === 'circle') {
      // Create a circle approximation using polygon points
      const centerLat = geofence.center_latitude;
      const centerLng = geofence.center_longitude;
      const radius = geofence.radius || 1000; // Default 1km
      
      if (!centerLat || !centerLng) {
        console.log('❌ Circle geofence missing center coordinates');
        return null;
      }
      
      const points = [];
      const sides = 32; // Number of points to approximate circle
      
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * 2 * Math.PI;
        const lat = centerLat + (radius / 111320) * Math.cos(angle); // Approximate conversion
        const lng = centerLng + (radius / (111320 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
        points.push({ latitude: lat, longitude: lng });
      }
      
      console.log('✅ Circle coordinates generated:', points.length, 'points');
      return points;
    }
    
    console.log('❌ Unsupported geofence type or missing data');
    return null;
  };

  const geofenceCoordinates = getGeofenceCoordinates();

  console.log('🗺️ GPS Debug Info:');
  console.log('   Alert GPS:', alertLocation?.latitude, alertLocation?.longitude);
  console.log('   Officer GPS:', officerLocation?.latitude, officerLocation?.longitude);
  console.log('   Alert geofence:', alert?.geofence);
  console.log('   Geofence coordinates:', geofenceCoordinates);

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
            {(() => {
              try {
                const date = new Date(alert.created_at);
                return isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
              } catch (error) {
                return 'Unknown time';
              }
            })()}
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
        {alertLocation && officerLocation ? (
          <>
            {/* Location Info Bar */}
            <View style={styles.locationInfoBar}>
              <Icon name="location-on" size={16} color={colors.primary} />
              <Text style={styles.locationInfoText}>
                🔴 Alert: {alertLocation.latitude.toFixed(6)}, {alertLocation.longitude.toFixed(6)}
              </Text>
              {distance && (
                <Text style={styles.distanceText}>
                  🚶 {distance.text} away
                </Text>
              )}
              <Text style={styles.locationAccuracyText}>
                GPS: ±{alertLocation.accuracy?.toFixed(1) || 10}m accuracy
              </Text>
            </View>
            
            <LeafletMap
              ref={mapRef}
              latitude={alertLocation.latitude}
              longitude={alertLocation.longitude}
              officerLatitude={officerLocation.latitude}
              officerLongitude={officerLocation.longitude}
              zoom={16} // Street level zoom
              height={screenHeight * 0.45} // Adjust height for info bar
              showMarker={true}
              markerTitle={`🔴 ${alert.alert_type?.toUpperCase() || 'ALERT'}: ${alert.message?.substring(0, 30) || 'Location'}`}
              polygonCoordinates={geofenceCoordinates}
              mapKey={`alert-${alert.id}-${Date.now()}`} // Force re-render
              autoFitBounds={true}
            />
            
            {/* Officer Location Indicator */}
            <View style={styles.officerLocationContainer}>
              <Icon name="person" size={16} color={colors.successGreen} />
              <Text style={styles.officerLocationText}>
                � You: {officerLocation.latitude.toFixed(6)}, {officerLocation.longitude.toFixed(6)}
              </Text>
              {distance && (
                <Text style={styles.officerDistanceText}>
                  Distance to alert: {distance.text}
                </Text>
              )}
            </View>
            
            {/* Debug coordinates overlay */}
            <View style={styles.debugOverlay}>
              <Text style={styles.debugText}>
                🔴 ALERT: {alertLocation.latitude.toFixed(8)}, {alertLocation.longitude.toFixed(8)}
              </Text>
              {officerLocation && (
                <Text style={styles.debugText}>
                  🔵 OFFICER: {officerLocation.latitude.toFixed(8)}, {officerLocation.longitude.toFixed(8)}
                </Text>
              )}
              {distance && (
                <Text style={styles.debugText}>
                  📏 DISTANCE: {distance.meters.toFixed(0)}m ({distance.kilometers.toFixed(3)}km)
                </Text>
              )}
              <Text style={styles.debugText}>
                🗺️ ZOOM: 18 (Street Level)
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
  distanceText: {
    fontSize: 12,
    color: colors.successGreen,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  officerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    padding: spacing.sm,
    borderRadius: 6,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  officerLocationText: {
    fontSize: 11,
    color: colors.darkText,
    marginLeft: spacing.xs,
    flex: 1,
  },
  officerDistanceText: {
    fontSize: 11,
    color: colors.successGreen,
    fontWeight: '600',
    marginTop: 2,
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