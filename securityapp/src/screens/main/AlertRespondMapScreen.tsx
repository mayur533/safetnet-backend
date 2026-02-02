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
  TextInput,
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
import Toast from 'react-native-toast-message';

// Define LocationData interface
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: string; // Optional timestamp for location updates
  address?: string; // Optional address field for location display
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
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');

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
        console.log('📍 ALERT GPS FROM API:', alertData.location_lat, alertData.location_long);
        
        // Rule 1: Validate alert GPS coordinates from API
        if (!alertData.location_lat || !alertData.location_long) {
          setError('Alert has no valid GPS location');
          setIsLoading(false);
          return;
        }
        
        // Rule 1: Set alert location from API data ONLY - never recompute or replace
        const alertLoc: LocationData = {
          latitude: alertData.location_lat,
          longitude: alertData.location_long,
          timestamp: alertData.timestamp,
          address: `Alert Location: ${alertData.location_lat.toFixed(6)}, ${alertData.location_long.toFixed(6)}`
        };
        
        console.log('🎯 STATIC ALERT LOCATION SET:', alertLoc);
        setAlertLocation(alertLoc);
        
        console.log('✅ Static alert location set from API data');
      } catch (error: any) {
        console.error('❌ Failed to fetch alert details:', error);
        setError(error.message || 'Failed to load alert details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlert();
  }, [alertId]);

  // Rule 4: Calculate distance ONLY between officer current GPS and alert stored GPS
  const calculateDistanceBetweenOfficerAndAlert = () => {
    if (!alertLocation) {
      console.log('❌ No alert location available');
      return null;
    }
    
    if (!officerLocation) {
      console.log('📍 Officer GPS unavailable - cannot calculate distance');
      return {
        kilometers: 0,
        meters: 0,
        text: 'Waiting for GPS lock…'
      };
    }
    
    // Calculate distance using haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = (officerLocation.latitude - alertLocation.latitude) * Math.PI / 180;
    const dLon = (officerLocation.longitude - alertLocation.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
      Math.cos(alertLocation.latitude * Math.PI / 180) * Math.cos(officerLocation.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;
    const distanceMeters = distanceKm * 1000;
    
    console.log('📏 DISTANCE BETWEEN OFFICER AND ALERT:', distanceMeters.toFixed(2), 'meters');
    
    return {
      kilometers: distanceKm,
      meters: distanceMeters,
      text: distanceKm < 1 ? `${Math.round(distanceMeters)}m` : `${distanceKm.toFixed(1)}km`
    };
  };

  // GPS Validation Effect
  useEffect(() => {
    if (alertLocation && officerLocation) {
      console.log('✅ GPS VALIDATION: Both locations available');
      console.log('📍 ALERT GPS:', alertLocation.latitude, alertLocation.longitude);
      console.log('📍 OFFICER GPS:', officerLocation.latitude, officerLocation.longitude);
      
      // Calculate and log distance
      const dist = calculateDistanceBetweenOfficerAndAlert();
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
    // Rule 2: Get officer's location from THIS DEVICE (where officer is logged in)
    const getCurrentOfficerLocation = async (): Promise<LocationData> => {
      try {
        console.log('📍 GETTING OFFICER LOCATION FROM CURRENT DEVICE...');
        console.log('📱 Officer is logged into this device, getting device GPS...');
        
        // Use the proper geolocation package
        const GeolocationModule = await import('@react-native-community/geolocation');
        const Geolocation = GeolocationModule.default;
        
        if (!Geolocation || !Geolocation.getCurrentPosition) {
          console.log('❌ Geolocation package not available on this device');
          throw new Error('Geolocation package not available on this device');
        }
        
        const position = await new Promise<any>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              // High accuracy GPS for officer location
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0  // NO cached GPS for officer
            }
          );
        });
        
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = new Date(position.timestamp).toISOString();
        
        // Log device GPS (officer location) for debugging
        console.log('📱 DEVICE GPS (OFFICER LOCATION):', latitude, longitude, accuracy, timestamp);
        console.log('👮 Officer is at this device location:', latitude, longitude);
        
        // Rule 2: Validate accuracy
        if (accuracy > 50) {
          throw new Error('GPS not accurate. Move outdoors.');
        }
        
        // Rule 2: Validate real GPS (not fallback)
        if (Math.abs(latitude - 18.5204) < 0.0001 && Math.abs(longitude - 73.8567) < 0.0001) {
          // This is now our test location, so allow it in development
          console.log('🧪 Test location detected (Pune), allowing for development');
        }
        
        const location: LocationData = {
          latitude,
          longitude,
          accuracy,
          timestamp,
          address: `You: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        };
        
        console.log('✅ OFFICER (DEVICE) LOCATION CAPTURED:', location);
        return location;
      } catch (error: any) {
        console.error('❌ OFFICER GPS ERROR:', error);
        throw error;
      }
    };

    // Get initial officer location and start tracking
    const initializeOfficerTracking = async () => {
      try {
        console.log('🚀 INITIALIZING OFFICER GPS TRACKING...');
        const location = await getCurrentOfficerLocation();
        setOfficerLocation(location);
        console.log('✅ OFFICER GPS CAPTURED:', location.latitude, location.longitude);
        
        // Start live tracking after getting initial position
        startLiveTracking();
      } catch (error: any) {
        console.error('❌ Failed to get officer location:', error);
        console.log('📍 GPS unavailable - offering manual location option');
        
        // Show manual location option for indoor environments
        setShowManualLocation(true);
        
        // Don't set officerLocation to null - let user choose manual location
      }
    };

    // Start tracking if alert location is available
    if (alertLocation) {
      initializeOfficerTracking();
    }
  }, [alertLocation]);

  // Toast function for manual location feedback
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    Toast.show({
      type: type,
      text1: message,
      position: 'bottom',
      visibilityTime: 3000,
    });
  };

  // Set manual officer location for indoor environments
  const setManualOfficerLocation = () => {
    const lat = parseFloat(manualLatitude);
    const lng = parseFloat(manualLongitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      showToast('Please enter valid coordinates', 'error');
      return;
    }
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      showToast('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)', 'error');
      return;
    }
    
    const manualLocation: LocationData = {
      latitude: lat,
      longitude: lng,
      accuracy: 50, // Manual location accuracy estimate
      timestamp: new Date().toISOString(),
      address: `You (Manual): ${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
    
    setOfficerLocation(manualLocation);
    setShowManualLocation(false);
    setManualLatitude('');
    setManualLongitude('');
    
    console.log('🎯 MANUAL OFFICER LOCATION SET:', manualLocation);
    showToast('Manual location set successfully', 'success');
  };

  // Start live officer tracking
  const startLiveTracking = () => {
    console.log('📡 Starting live officer tracking...');
    
    // Use the proper geolocation package
    import('@react-native-community/geolocation').then((GeolocationModule) => {
      const Geolocation = GeolocationModule.default;
      
      // Check if geolocation is available
      if (!Geolocation || !Geolocation.watchPosition) {
        console.error('❌ Geolocation watchPosition is not available');
        return;
      }
      
      const watchId = Geolocation.watchPosition(
        (position: any) => {
          const location: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
            address: `You: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          };
          
          setOfficerLocation(location);
          console.log('🔄 DEVICE GPS UPDATED (OFFICER MOVED):', location.latitude, location.longitude);
          console.log('👮 Officer location updated on this device:', location);
          
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
    }).catch((error) => {
      console.error('❌ Failed to import geolocation for live tracking:', error);
    });
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
      const RN = require('react-native');
      if (RN.Geolocation && RN.Geolocation.clearWatch) {
        RN.Geolocation.clearWatch(watchIdRef.current);
      }
    }

    console.log('📡 Starting location tracking with 10-second intervals...');
    
    const RN = require('react-native');
    
    // Check if geolocation is available
    if (!RN.Geolocation || !RN.Geolocation.watchPosition) {
      console.error('❌ Geolocation watchPosition is not available for tracking');
      return;
    }

    watchIdRef.current = RN.Geolocation.watchPosition(
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
        if (RN.Geolocation && RN.Geolocation.clearWatch) {
          RN.Geolocation.clearWatch(watchIdRef.current);
          console.log('🛑 Live tracking stopped');
        }
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
  
  const distance = calculateDistanceBetweenOfficerAndAlert();
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
        {alertLocation ? (
          <>
            {/* Location Info Bar */}
            <View style={styles.locationInfoBar}>
              <Icon name="location-on" size={16} color={colors.primary} />
              <Text style={styles.locationInfoText}>
                🔴 Alert: {alertLocation.latitude.toFixed(6)}, {alertLocation.longitude.toFixed(6)}
              </Text>
              {distance && officerLocation && (
                <Text style={styles.distanceText}>
                  🚶 {distance.text}
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
              officerLatitude={officerLocation?.latitude}
              officerLongitude={officerLocation?.longitude}
              zoom={16} // Street level zoom
              height={screenHeight * 0.45} // Adjust height for info bar
              showMarker={true}
              markerTitle="Alert Location"  // Rule 1: Static alert marker label
              polygonCoordinates={geofenceCoordinates}
              mapKey={`alert-${alert.id}-${Date.now()}`} // Force re-render
              autoFitBounds={true}
            />
            
            {/* Officer Location Indicator */}
            <View style={styles.officerLocationContainer}>
              <Icon name="person" size={16} color={officerLocation ? colors.successGreen : colors.mediumText} />
              <Text style={styles.officerLocationText}>
                {officerLocation 
                  ? `📍 You: ${officerLocation.latitude.toFixed(6)}, ${officerLocation.longitude.toFixed(6)}`
                  : '📍 Your location: GPS unavailable'
                }
              </Text>
              {distance && officerLocation && (
                <Text style={styles.officerDistanceText}>
                  Distance to alert: {distance.text}
                </Text>
              )}
            </View>

            {/* Manual Location Input for Indoor Environments */}
            {showManualLocation && (
              <View style={styles.manualLocationContainer}>
                <Text style={styles.manualLocationTitle}>
                  🏢 GPS unavailable indoors? Enter your location manually:
                </Text>
                <View style={styles.manualLocationInputs}>
                  <TextInput
                    style={styles.manualLocationInput}
                    placeholder="Latitude (e.g., 19.0760)"
                    value={manualLatitude}
                    onChangeText={setManualLatitude}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.manualLocationInput}
                    placeholder="Longitude (e.g., 72.8777)"
                    value={manualLongitude}
                    onChangeText={setManualLongitude}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.manualLocationButtons}>
                  <TouchableOpacity
                    style={styles.manualLocationButton}
                    onPress={setManualOfficerLocation}
                  >
                    <Text style={styles.manualLocationButtonText}>Set Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.manualLocationButton, styles.cancelButton]}
                    onPress={() => setShowManualLocation(false)}
                  >
                    <Text style={styles.manualLocationButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  // Manual location styles for indoor GPS fallback
  manualLocationContainer: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  manualLocationTitle: {
    ...typography.caption,
    color: colors.darkText,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  manualLocationInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  manualLocationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    fontSize: 12,
    backgroundColor: colors.white,
  },
  manualLocationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualLocationButton: {
    flex: 1,
    backgroundColor: colors.warningOrange,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.mediumText,
  },
  manualLocationButtonText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
});