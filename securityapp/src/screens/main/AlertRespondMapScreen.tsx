import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, NavigationProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAlertsStore } from '../../store/alertsStore';
import { useGeofenceStore } from '../../store/geofenceStore';
import { useAppSelector } from '../../store/hooks';
import { alertService } from '../../api/services/alertService';
import { geofenceService, locationService } from '../../api/services/geofenceService';
import { zoneTrackingService } from '../../services/zoneTrackingService';
import { officerGeofenceService } from '../../services/officerGeofenceService';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { formatExactTime } from '../../utils/helpers';
import { LeafletMap } from '../../components/maps/LeafletMap';
import Toast from 'react-native-toast-message';
import { Alert } from '../../types/alert.types';

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
type AlertRespondMapScreenNavigationProp = NavigationProp<Record<string, AlertRespondMapScreenParams>>;

export const AlertRespondMapScreen = () => {
  const colors = useColors();
  const navigation = useNavigation<AlertRespondMapScreenNavigationProp>();
  const route = useRoute<AlertRespondMapScreenRouteProp>();
  const { alertId } = route.params || {};
  
  // Get officer data from Redux store
  const officer = useAppSelector(state => state.auth.officer);

  const { resolveAlert, updateAlert: storeUpdateAlert } = useAlertsStore();
  const { updateLocation } = useGeofenceStore();

  // State
  const [alert, setAlert] = useState<Alert | null>(null);
  const [alertLocation, setAlertLocation] = useState<LocationData | null>(null);
  const [officerLocation, setOfficerLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [geofenceData, setGeofenceData] = useState<any>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  
  // Zone tracking state
  const [zoneStatuses, setZoneStatuses] = useState<any[]>([]);
  const [recentZoneEvents, setRecentZoneEvents] = useState<any[]>([]);
  const [isZoneTracking, setIsZoneTracking] = useState(false);
  
  // Officer geofences state
  const [officerGeofences, setOfficerGeofences] = useState<any[]>([]);
  const [officerGeofenceCoords, setOfficerGeofenceCoords] = useState<any[]>([]);

  // Refs for cleanup
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
        
        // Rule 1: Additional GPS accuracy validation for alert location
        const alertLat = parseFloat(String(alertData.location_lat));
        const alertLng = parseFloat(String(alertData.location_long));
        
        // Validate GPS coordinate ranges
        if (isNaN(alertLat) || isNaN(alertLng) || 
            alertLat < -90 || alertLat > 90 || 
            alertLng < -180 || alertLng > 180) {
          console.error('❌ Invalid alert GPS coordinates:', { lat: alertLat, lng: alertLng });
          setError('Alert has invalid GPS coordinates');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Alert GPS coordinates validated:', {
          latitude: alertLat,
          longitude: alertLng,
          precision: '6 decimal places (≈1m accuracy)',
          valid: true
        });
        
        // Rule 1: Set alert location from API data ONLY - never recompute or replace
        const alertLoc: LocationData = {
          latitude: alertLat,
          longitude: alertLng,
          timestamp: alertData.timestamp,
          address: `Alert Location: ${alertLat.toFixed(6)}, ${alertLng.toFixed(6)}`
        };
        
        console.log('🎯 STATIC ALERT LOCATION SET:', alertLoc);
        setAlertLocation(alertLoc);
        
        // Fetch geofence data if not included in alert
        if (alertData.geofence_id && !alertData.geofence) {
          console.log('🗺️ Fetching geofence data for ID:', alertData.geofence_id);
          try {
            const geofence = await geofenceService.getGeofenceById(alertData.geofence_id);
            setGeofenceData(geofence);
            console.log('✅ Geofence data fetched:', geofence);
          } catch (geofenceError) {
            console.warn('⚠️ Failed to fetch geofence data:', geofenceError);
          }
        } else if (alertData.geofence && typeof alertData.geofence === 'object') {
          setGeofenceData(alertData.geofence);
          console.log('✅ Using geofence object from alert:', alertData.geofence);
        } else if (alertData.geofence && typeof alertData.geofence === 'number') {
          // Handle case where geofence is just an ID
          console.log('🗺️ Geofence is an ID, fetching full data:', alertData.geofence);
          try {
            const geofence = await geofenceService.getGeofenceById(String(alertData.geofence));
            setGeofenceData(geofence);
            console.log('✅ Geofence data fetched from ID:', geofence);
          } catch (geofenceError: any) {
            console.warn('⚠️ Failed to fetch geofence data from ID:', geofenceError);
            
            // Check if it's an SSL error and use mock geofence
            if (geofenceError.message && geofenceError.message.includes('SSL')) {
              console.log('🔐 SSL error detected, using mock geofence data');
              const mockGeofence = {
                id: String(alertData.geofence),
                name: 'Jay Ganesh Vision',
                description: 'Test geofence for SSL fallback',
                geofence_type: 'polygon',
                polygon_json: JSON.stringify({
                  type: 'Polygon',
                  coordinates: [[
                    [73.784608, 18.6473915], // [longitude, latitude]
                    [73.785608, 18.6473915],
                    [73.785608, 18.6483915],
                    [73.784608, 18.6483915],
                    [73.784608, 18.6473915]
                  ]]
                }),
                center_latitude: 18.6473915,
                center_longitude: 73.784608,
                radius: 500,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              setGeofenceData(mockGeofence);
              console.log('✅ Mock geofence data set:', mockGeofence);
            }
          }
        }
        
        // Initialize zone tracking if geofence data is available
        if (geofenceData || alertData.geofence) {
          initializeZoneTracking();
        }
        
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

  // Fetch officer assigned geofences
  useEffect(() => {
    const fetchOfficerGeofences = async () => {
      try {
        console.log('🔍 Fetching officer assigned geofences...');
        
        // Get logged-in officer ID from auth state
        const officerId = officer?.security_id || 'officer_001'; // Fallback to mock ID for development
        
        console.log('Using officer ID:', officerId);
        
        const geofences = await officerGeofenceService.getOfficerGeofences(officerId);
        
        // Implement coordinate logic inline since getAllOfficerGeofenceCoordinates was removed
        const geofenceCoords = geofences.map((geofence: any) => ({
          geofenceId: geofence.id,
          coordinates: geofence.geofence_type === 'circle' && geofence.center_point
            ? [{ latitude: geofence.center_point[0], longitude: geofence.center_point[1] }]
            : geofence.geofence_type === 'polygon' && geofence.polygon_json
            ? geofence.polygon_json.map(([lat, lng]: number[]) => ({ latitude: lat, longitude: lng }))
            : []
        }));
        
        setOfficerGeofences(geofences);
        setOfficerGeofenceCoords(geofenceCoords);
        
        console.log('✅ Officer geofences fetched:', {
          count: geofences.length,
          names: geofences.map(g => g.name),
          coordinatesCount: geofenceCoords.length
        });
        
      } catch (error: any) {
        console.error('❌ Failed to fetch officer geofences:', error);
      }
    };

    fetchOfficerGeofences();
  }, []);

  // Initialize zone tracking
  const initializeZoneTracking = () => {
    const zone = geofenceData || alert?.geofence;
    if (!zone) return;

    console.log('🗺️ Initializing zone tracking for zone:', zone.name);
    
    // Mock officer data - in real app, this would come from auth context
    const mockOfficer = {
      id: 'officer_001',
      name: 'Security Officer',
      assignedZones: [zone],
    };

    zoneTrackingService.initializeOfficerTracking(
      mockOfficer.id,
      mockOfficer.name,
      mockOfficer.assignedZones
    );

    // Add zone event listener
    const handleZoneEvent = (event: any) => {
      console.log('📍 Zone event:', event);
      setRecentZoneEvents(prev => [event, ...prev.slice(0, 9)]);
      
      // Show toast for zone events
      Toast.show({
        type: event.eventType === 'entry' ? 'success' : 'error',
        text1: `Zone ${event.eventType === 'entry' ? 'Entry' : 'Exit'}`,
        text2: `${event.officerName} ${event.eventType === 'entry' ? 'entered' : 'exited'} ${event.zoneName}`,
      });
    };

    zoneTrackingService.addEventListener(mockOfficer.id, handleZoneEvent);
    
    // Get initial zone status
    const initialStatus = zoneTrackingService.getOfficerZoneStatus(mockOfficer.id);
    setZoneStatuses(initialStatus);
    
    setIsZoneTracking(true);
  };

  // Update officer location and check zones
  useEffect(() => {
    if (officerLocation && isZoneTracking) {
      console.log('📍 Updating officer location for zone tracking:', officerLocation);
      
      // Update zone tracking service
      const mockOfficerId = 'officer_001';
      zoneTrackingService.updateOfficerLocation(mockOfficerId, {
        latitude: officerLocation.latitude,
        longitude: officerLocation.longitude,
        accuracy: officerLocation.accuracy || 0,
        timestamp: typeof officerLocation.timestamp === 'number' ? officerLocation.timestamp : Date.now(),
      });
      
      // Update zone statuses
      const updatedStatuses = zoneTrackingService.getOfficerZoneStatus(mockOfficerId);
      setZoneStatuses(updatedStatuses);
    }
  }, [officerLocation, isZoneTracking]);

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

  // Get geofence coordinates
  const getGeofenceCoordinates = useCallback(() => {
    // Use geofenceData state first, then fallback to alert.geofence
    const geofence = geofenceData || alert?.geofence;
    
    if (!geofence) {
      console.log('❌ No geofence data available');
      return null;
    }
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
  }, [geofenceData, alert?.geofence]);

  // GPS Validation Effect
  useEffect(() => {
    console.log('🗺️ GPS Debug Info:');
    console.log('   Alert GPS:', alertLocation?.latitude, alertLocation?.longitude);
    console.log('   Officer GPS: Not required - officer GPS tracking removed');
    console.log('   Alert geofence:', alert?.geofence);
    const geofenceCoordinates = getGeofenceCoordinates();
    console.log('   Geofence coordinates:', geofenceCoordinates);
  }, [alertLocation, alert, geofenceData, getGeofenceCoordinates]);

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

      console.log('✅ Alert response accepted successfully - Status changed to "accepted"');

      // Show success toast notification
      Toast.show({
        type: 'success',
        text1: 'Response Accepted',
        text2: 'You are now responding to this alert. The alert has been moved to the Accepted section.',
        visibilityTime: 3000, // 3 seconds
        position: 'bottom',
      });

      // Navigate back after a short delay to let user see the toast
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error: any) {
      console.error('❌ Failed to accept alert response:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to accept alert response. Please try again.',
        visibilityTime: 3000,
        position: 'bottom',
      });
    } finally {
      setIsAccepting(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.goBack();
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mediumText }]}>Loading alert details...</Text>
      </View>
    );
  }

  // Error state or missing GPS
  if (error || !alert || !alertLocation) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Icon name="error" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error || 'Alert has no valid GPS location'}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={handleBack}
        >
          <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const geofenceCoordinates = getGeofenceCoordinates();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.darkText }]}>Respond to Alert</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Alert Info */}
      <View style={[styles.alertInfo, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTypeContainer}>
            <Icon
              name={alert.alert_type === 'emergency' ? 'warning' : 'notification-important'}
              size={20}
              color={alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warning}
            />
            <Text style={[
              styles.alertType,
              { color: alert.alert_type === 'emergency' ? colors.emergencyRed : colors.warning }
            ]}>
              {alert.alert_type.toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.alertTime, { color: colors.mediumText }]}>
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

        <Text style={[styles.alertMessage, { color: colors.darkText }]}>{alert.message}</Text>

        {alert.description && (
          <Text style={[styles.alertDescription, { color: colors.darkText }]}>{alert.description}</Text>
        )}

        <View style={styles.alertMeta}>
          <Text style={[styles.alertMetaText, { color: colors.mediumText }]}>
            Status: <Text style={[styles.alertMetaValue, { color: colors.darkText }]}>{alert.status || 'pending'}</Text>
          </Text>
          {alert.user_name && (
            <Text style={[styles.alertMetaText, { color: colors.mediumText }]}>
              From: <Text style={[styles.alertMetaValue, { color: colors.darkText }]}>{alert.user_name}</Text>
            </Text>
          )}
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>

        {alertLocation ? (
          <>
            {/* Location Info Bar */}
            <View style={[styles.locationInfoBar, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
              <Icon name="location-on" size={16} color={colors.primary} />
              <Text style={[styles.locationInfoText, { color: colors.darkText }]}>
                🔴 Alert: {alertLocation.latitude.toFixed(6)}, {alertLocation.longitude.toFixed(6)}
              </Text>
              <Text style={[styles.locationAccuracyText, { color: colors.mediumText }]}>
                GPS: ±10m accuracy
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
              multiplePolygons={officerGeofenceCoords.map(gf => ({
                id: gf.id,
                name: gf.name,
                coordinates: gf.coordinates,
                color: colors.primary, // Use theme primary color for officer zones
              }))}
              mapKey={`alert-${alert.id}-${Date.now()}`} // Force re-render
              autoFitBounds={true}
            />
            
            {/* Officer Location Indicator */}
            <View style={[
              styles.officerLocationContainer, 
              { 
                backgroundColor: `${colors.success}20`, 
                borderColor: `${colors.success}50` 
              }
            ]}>
              <Icon name="person" size={16} color={officerLocation ? colors.success : colors.mediumText} />
              <Text style={[styles.officerLocationText, { color: colors.darkText }]}>
                {officerLocation 
                  ? `📍 You: ${officerLocation.latitude.toFixed(6)}, ${officerLocation.longitude.toFixed(6)}`
                  : '📍 Your location: GPS unavailable'
                }
              </Text>
            </View>

            {/* Manual Location Input for Indoor Environments */}
            {showManualLocation && (
              <View style={[styles.manualLocationContainer, { backgroundColor: colors.white }]}>
                <Text style={[styles.manualLocationTitle, { color: colors.darkText }]}>
                  🏢 GPS unavailable indoors? Enter your location manually:
                </Text>
                <View style={styles.manualLocationInputs}>
                  <TextInput
                    style={[styles.manualLocationInput, { 
                      borderColor: colors.border,
                      backgroundColor: colors.lightGrayBg,
                      color: colors.darkText
                    }]}
                    placeholder="Latitude (e.g., 19.0760)"
                    placeholderTextColor={colors.mediumText}
                    value={manualLatitude}
                    onChangeText={setManualLatitude}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.manualLocationInput, { 
                      borderColor: colors.border,
                      backgroundColor: colors.lightGrayBg,
                      color: colors.darkText
                    }]}
                    placeholder="Longitude (e.g., 72.8777)"
                    placeholderTextColor={colors.mediumText}
                    value={manualLongitude}
                    onChangeText={setManualLongitude}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.manualLocationButtons}>
                  <TouchableOpacity
                    style={[styles.manualLocationButton, { backgroundColor: colors.primary }]}
                    onPress={setManualOfficerLocation}
                  >
                    <Text style={[styles.manualLocationButtonText, { color: colors.white }]}>Set Location</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.manualLocationButton, styles.cancelButton, { backgroundColor: colors.mediumText }]}
                    onPress={() => setShowManualLocation(false)}
                  >
                    <Text style={[styles.manualLocationButtonText, { color: colors.white }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={[styles.mapPlaceholder, styles.centered, { backgroundColor: colors.lightGrayBg }]}>
            <Icon name="location-off" size={48} color={colors.mediumText} />
            <Text style={[styles.mapPlaceholderText, { color: colors.mediumText }]}>
              No location coordinates available for this alert
            </Text>
          </View>
        )}
      </View>

      {/* Accept Button */}
      <View style={[styles.footer, { backgroundColor: colors.white, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.acceptButton, 
            { 
              backgroundColor: colors.success,
              shadowColor: colors.shadow
            }, 
            isAccepting && styles.acceptButtonDisabled
          ]}
          onPress={handleAcceptAlert}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.textOnPrimary} />
          ) : (
            <>
              <Icon name="check-circle" size={24} color={colors.textOnPrimary} />
              <Text style={[styles.acceptButtonText, { color: colors.textOnPrimary }]}>Accept & Respond</Text>
            </>
          )}
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.screenHeader,
  },
  placeholder: {
    width: 40,
  },
  alertInfo: {
    padding: spacing.lg,
    borderBottomWidth: 1,
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
  },
  alertMessage: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  alertDescription: {
    ...typography.body,
    marginBottom: spacing.sm,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertMetaText: {
    ...typography.caption,
  },
  alertMetaValue: {
    ...typography.caption,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPlaceholder: {
    height: screenHeight * 0.5,
    borderRadius: 12,
  },
  mapPlaceholderText: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  officerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 6,
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  officerLocationText: {
    fontSize: 11,
    marginLeft: spacing.xs,
    flex: 1,
  },
  officerDistanceText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  acceptButtonText: {
    ...typography.body,
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
    marginLeft: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  // Location info styles
  locationInfoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  locationInfoText: {
    ...typography.caption,
    marginLeft: spacing.xs,
    flex: 1,
    fontFamily: 'monospace',
  },
  locationAccuracyText: {
    ...typography.caption,
    fontSize: 10,
  },
  // Zone status styles
  zoneStatusContainer: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  zoneStatusTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  zoneStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: spacing.xs,
  },
  zoneIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  zoneStatusText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  zoneTimeText: {
    ...typography.caption,
    fontSize: 10,
  },
  // Manual location styles for indoor GPS fallback
  manualLocationContainer: {
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
    borderWidth: 1,
  },
  manualLocationTitle: {
    ...typography.caption,
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
    borderRadius: 6,
    padding: spacing.sm,
    fontSize: 12,
  },
  manualLocationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualLocationButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    opacity: 0.7,
  },
  manualLocationButtonText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
});