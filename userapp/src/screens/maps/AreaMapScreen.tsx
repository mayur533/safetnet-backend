import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
// Conditionally import MapView to handle module loading errors gracefully
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
let Circle: any = null;
let mapsModuleAvailable = false;

// Try to load react-native-maps with error handling
try {
  // Use dynamic import to catch module loading errors
  const mapsModule = require('react-native-maps');
  if (mapsModule) {
    MapView = mapsModule.default || mapsModule.MapView;
    Marker = mapsModule.Marker;
    PROVIDER_GOOGLE = mapsModule.PROVIDER_GOOGLE || 'google';
    Circle = mapsModule.Circle;
    mapsModuleAvailable = MapView !== null && Marker !== null;
    if (mapsModuleAvailable) {
      console.log('react-native-maps loaded successfully');
    }
  }
} catch (error: any) {
  console.warn('react-native-maps not available:', error?.message || error);
  mapsModuleAvailable = false;
}

// Import Geolocation - it should be properly linked now
import Geolocation from '@react-native-community/geolocation';

// Set default options for Geolocation
Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
});
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@react-navigation/native';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {ThemedAlert} from '../../components/common/ThemedAlert';

const {width, height} = Dimensions.get('window');

interface Location {
  latitude: number;
  longitude: number;
}

interface NearbyHelp {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire' | 'pharmacy' | 'clinic';
  location: Location;
  address?: string;
  phone?: string;
  distance?: number;
}

const AreaMapScreen = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const {colors} = theme;
  const isDarkMode = theme.dark;
  const user = useAuthStore((state) => state.user);
  const {isPremium} = useSubscription();
  
  const mapRef = useRef<MapView>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [nearbyHelp, setNearbyHelp] = useState<NearbyHelp[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success' | 'info' | 'warning';
    buttons: Array<{text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({
    title: '',
    message: '',
    type: 'info',
    buttons: [],
  });

  // Request location permission
  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (hasPermission) {
          setLocationPermissionGranted(true);
          // Request authorization from Geolocation module if not already authorized
          try {
            await Geolocation.requestAuthorization();
          } catch (authError) {
            console.warn('Geolocation authorization error:', authError);
          }
          getCurrentLocation();
          return;
        }
        
        // Only request if not already granted
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location to show nearby help.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setLocationPermissionGranted(true);
          // Request authorization from Geolocation module
          try {
            await Geolocation.requestAuthorization();
          } catch (authError) {
            console.warn('Geolocation authorization error:', authError);
          }
          getCurrentLocation();
        } else {
          setLocationPermissionGranted(false);
          setLoading(false);
          // Only show alert if permission was denied, not if it was already granted
          if (granted === PermissionsAndroid.RESULTS.DENIED) {
            setAlertConfig({
              title: 'Location Permission Required',
              message: 'Please enable location permission in settings to see nearby help.',
              type: 'warning',
              buttons: [
                {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
                {text: 'Open Settings', onPress: () => {
                  Linking.openSettings();
                  setAlertVisible(false);
                }},
              ],
            });
            setAlertVisible(true);
          }
        }
      } catch (err) {
        console.warn('Location permission error:', err);
        setLoading(false);
      }
    } else {
      // iOS - check authorization status first
      try {
        const authStatus = await Geolocation.requestAuthorization();
        if (authStatus === 'granted' || authStatus === 'restricted') {
          setLocationPermissionGranted(true);
          getCurrentLocation();
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.warn('Location authorization error:', err);
        setLoading(false);
      }
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        loadNearbyHelp(location);
        if (user?.id && isPremium) {
          loadGeofences();
        }
        setLoading(false);
        
        // Center map on user location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLoading(false);
        
        // Check if permission is actually granted before showing error
        const checkPermissionAndShowError = async () => {
          if (Platform.OS === 'android') {
            const hasPermission = await PermissionsAndroid.check(
              PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            
            // Only show error if permission is denied, not if it's granted but GPS failed
            if (!hasPermission && error.code === 1) {
              setAlertConfig({
                title: 'Location Permission Required',
                message: 'Please enable location permission in settings to see nearby help.',
                type: 'warning',
                buttons: [
                  {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
                  {text: 'Open Settings', onPress: () => {
                    Linking.openSettings();
                    setAlertVisible(false);
                  }},
                  {text: 'Retry', onPress: () => {
                    setAlertVisible(false);
                    getCurrentLocation();
                  }},
                ],
              });
              setAlertVisible(true);
            } else if (error.code === 2) {
              // Position unavailable - GPS might be off
              setAlertConfig({
                title: 'Location Unavailable',
                message: 'Please ensure location services are enabled on your device.',
                type: 'warning',
                buttons: [
                  {text: 'OK', onPress: () => setAlertVisible(false)},
                  {text: 'Retry', onPress: () => {
                    setAlertVisible(false);
                    getCurrentLocation();
                  }},
                ],
              });
              setAlertVisible(true);
            } else {
              // For timeout or other errors when permission is granted, just log silently
              console.warn('Location error (permission granted):', error.message);
            }
          } else {
            // iOS - only show if permission denied
            if (error.code === 1) {
              setAlertConfig({
                title: 'Location Permission Required',
                message: 'Please enable location permission in settings.',
                type: 'warning',
                buttons: [
                  {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
                  {text: 'Open Settings', onPress: () => {
                    Linking.openSettings();
                    setAlertVisible(false);
                  }},
                ],
              });
              setAlertVisible(true);
            } else {
              console.warn('Location error:', error.message);
            }
          }
        };
        
        checkPermissionAndShowError();
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout to 30 seconds
        maximumAge: 60000, // Accept cached location up to 1 minute old
        distanceFilter: 10, // Update if moved 10 meters
      }
    );
  };

  const loadNearbyHelp = async (location: Location) => {
    try {
      const response = await apiService.getNearbyHelp(location.latitude, location.longitude, 5000);
      
      // Transform API response to NearbyHelp format
      const helpLocations: NearbyHelp[] = Array.isArray(response.places)
        ? response.places.map((place: any) => ({
            id: place.id?.toString() || '',
            name: place.name || '',
            type: place.type || 'clinic',
            location: {
              latitude: place.latitude || 0,
              longitude: place.longitude || 0,
            },
            address: place.address,
            phone: place.phone,
            distance: place.distance,
          }))
        : [];
      
      setNearbyHelp(helpLocations);
    } catch (error) {
      console.error('Failed to load nearby help:', error);
      setNearbyHelp([]);
    }
  };

  const loadGeofences = async () => {
    if (!user?.id) return;
    
    try {
      const data = await apiService.getGeofences(parseInt(user.id));
      const transformedGeofences = Array.isArray(data)
        ? data.map((geo: any) => ({
            id: geo.id?.toString() || geo.name,
            name: geo.name,
            radius: geo.radius_meters || geo.radius,
            center: geo.center_location ? {
              lat: geo.center_location.latitude || geo.center_location.lat,
              lng: geo.center_location.longitude || geo.center_location.lng,
            } : {lat: 0, lng: 0},
            isActive: geo.is_active !== false,
          }))
        : [];
      setGeofences(transformedGeofences);
    } catch (error) {
      console.error('Failed to load geofences:', error);
      setGeofences([]);
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'hospital':
        return 'local-hospital';
      case 'police':
        return 'local-police';
      case 'fire':
        return 'local-fire-department';
      case 'pharmacy':
        return 'local-pharmacy';
      case 'clinic':
        return 'medical-services';
      default:
        return 'place';
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'hospital':
        return '#DC2626'; // Red
      case 'police':
        return '#1D4ED8'; // Blue
      case 'fire':
        return '#F59E0B'; // Orange
      case 'pharmacy':
        return '#10B981'; // Green
      case 'clinic':
        return '#8B5CF6'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  };

  const handleMarkerPress = (help: NearbyHelp) => {
    const message = `${help.address || 'No address'}\n${help.phone || 'No phone'}\n${help.distance ? `${help.distance.toFixed(1)} km away` : ''}`;
    const buttons: Array<{text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'}> = [
      {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
    ];
    
    if (help.phone) {
      buttons.push({
        text: 'Call',
        onPress: () => {
          Linking.openURL(`tel:${help.phone}`).catch(() => {
            setAlertConfig({
              title: 'Error',
              message: 'Could not make phone call',
              type: 'error',
              buttons: [{text: 'OK', onPress: () => setAlertVisible(false)}],
            });
            setAlertVisible(true);
          });
          setAlertVisible(false);
        },
      });
    }
    
    buttons.push({
      text: 'Directions',
      onPress: () => {
        setAlertVisible(false);
        const url = Platform.select({
          ios: `maps://app?daddr=${help.location.latitude},${help.location.longitude}`,
          android: `google.navigation:q=${help.location.latitude},${help.location.longitude}`,
        });
        if (url) {
          Linking.openURL(url).catch(() => {
            // Fallback to web maps
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${help.location.latitude},${help.location.longitude}`).catch(() => {
              setAlertConfig({
                title: 'Error',
                message: 'Could not open maps app',
                type: 'error',
                buttons: [{text: 'OK', onPress: () => setAlertVisible(false)}],
              });
              setAlertVisible(true);
            });
          });
        }
      },
    });
    
    setAlertConfig({
      title: help.name,
      message: message,
      type: 'info',
      buttons: buttons,
    });
    setAlertVisible(true);
  };

  const centerOnUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, {color: colors.text}]}>Loading map...</Text>
        </View>
      </View>
    );
  }

  if (!locationPermissionGranted || !userLocation) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="location-off" size={64} color={colors.notification} />
          <Text style={[styles.errorText, {color: colors.text}]}>Location Permission Required</Text>
          <Text style={[styles.errorSubtext, {color: colors.text}]}>
            Please enable location permission to see nearby help.
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, {backgroundColor: colors.primary}]}
            onPress={requestLocationPermission}>
            <Text style={styles.retryButtonText}>Enable Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If MapView is not available, show fallback UI with nearby help list
  if (!mapsModuleAvailable || !MapView || !userLocation) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
        <ScrollView 
          style={styles.fallbackContainer}
          contentContainerStyle={styles.fallbackContent}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="map" size={64} color={colors.primary} />
            <Text style={[styles.errorText, {color: colors.text}]}>Map View Unavailable</Text>
            <Text style={[styles.errorSubtext, {color: colors.text}]}>
              Nearby help locations are listed below. Tap to call or get directions.
            </Text>
          </View>
          
          {nearbyHelp.length > 0 ? (
            <View style={styles.helpListContainer}>
              {nearbyHelp.map((help) => (
                <TouchableOpacity
                  key={help.id}
                  style={[styles.helpListItem, {backgroundColor: colors.card, borderColor: colors.border}]}
                  onPress={() => handleMarkerPress(help)}
                  activeOpacity={0.7}>
                  <View style={[styles.helpListIcon, {backgroundColor: getMarkerColor(help.type)}]}>
                    <MaterialIcons name={getMarkerIcon(help.type) as any} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.helpListContent}>
                    <Text style={[styles.helpListName, {color: colors.text}]}>{help.name}</Text>
                    {help.address && (
                      <Text style={[styles.helpListAddress, {color: colors.text}]}>{help.address}</Text>
                    )}
                    {help.distance && (
                      <Text style={[styles.helpListDistance, {color: colors.text}]}>
                        {help.distance.toFixed(1)} km away
                      </Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.text} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="location-off" size={48} color={colors.notification} />
              <Text style={[styles.emptyStateText, {color: colors.text}]}>No nearby help found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      <ThemedAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onDismiss={() => setAlertVisible(false)}
      />
      <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top}]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        toolbarEnabled={false}
        mapType="standard">
        
        {/* User location marker */}
        <Marker
          coordinate={userLocation}
          title="Your Location"
          description="You are here">
          <View style={[styles.userMarker, {backgroundColor: colors.primary}]}>
            <MaterialIcons name="person-pin-circle" size={32} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Nearby help markers */}
        {nearbyHelp.map((help) => (
          <Marker
            key={help.id}
            coordinate={help.location}
            title={help.name}
            description={help.address || help.type}
            onPress={() => handleMarkerPress(help)}>
            <View style={[styles.helpMarker, {backgroundColor: getMarkerColor(help.type)}]}>
              <MaterialIcons name={getMarkerIcon(help.type) as any} size={24} color="#FFFFFF" />
            </View>
          </Marker>
        ))}

        {/* Geofences (premium feature) */}
        {isPremium && geofences.map((geo) => {
          if (geo.center.lat === 0 && geo.center.lng === 0) return null;
          const strokeColor = geo.isActive ? colors.primary : colors.notification;
          const fillColor = geo.isActive 
            ? `${colors.primary || '#2563EB'}20` 
            : `${colors.notification || '#EF4444'}20`;
          return (
            <Circle
              key={geo.id}
              center={{latitude: geo.center.lat, longitude: geo.center.lng}}
              radius={geo.radius || 100}
              strokeColor={strokeColor}
              fillColor={fillColor}
              strokeWidth={2}
            />
          );
        })}
      </MapView>

      {/* Floating action button to center on user location */}
      <TouchableOpacity
        style={[styles.centerButton, {backgroundColor: colors.primary}]}
        onPress={centerOnUserLocation}
        activeOpacity={0.8}>
        <MaterialIcons name="my-location" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Legend */}
      <View style={[styles.legend, {backgroundColor: colors.card}]}>
        <Text style={[styles.legendTitle, {color: colors.text}]}>Nearby Help</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, {backgroundColor: '#DC2626'}]}>
              <MaterialIcons name="local-hospital" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.legendText, {color: colors.text}]}>Hospital</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, {backgroundColor: '#1D4ED8'}]}>
              <MaterialIcons name="local-police" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.legendText, {color: colors.text}]}>Police</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, {backgroundColor: '#F59E0B'}]}>
              <MaterialIcons name="local-fire-department" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.legendText, {color: colors.text}]}>Fire</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, {backgroundColor: '#10B981'}]}>
              <MaterialIcons name="local-pharmacy" size={16} color="#FFFFFF" />
            </View>
            <Text style={[styles.legendText, {color: colors.text}]}>Pharmacy</Text>
          </View>
        </View>
      </View>
    </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  helpMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  centerButton: {
    position: 'absolute',
    bottom: 120,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontSize: 12,
  },
  fallbackContainer: {
    flex: 1,
  },
  fallbackContent: {
    padding: 16,
  },
  helpListContainer: {
    marginTop: 24,
    gap: 12,
  },
  helpListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  helpListIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpListContent: {
    flex: 1,
  },
  helpListName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  helpListAddress: {
    fontSize: 14,
    marginBottom: 2,
  },
  helpListDistance: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default AreaMapScreen;
