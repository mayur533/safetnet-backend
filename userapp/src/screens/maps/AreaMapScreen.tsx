import React, {useState, useEffect, useRef, useCallback} from 'react';
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
  ScrollView,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import GeolocationService from 'react-native-geolocation-service';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '@react-navigation/native';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {ThemedAlert} from '../../components/common/ThemedAlert';
import {MapView, Marker, Circle, UrlTile, PROVIDER_GOOGLE, mapsModuleAvailable, PROVIDER_DEFAULT} from '../../utils/mapComponents';
import MapTileLayer from '../../utils/MapTileLayer';

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
});

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

const formatRelativeTime = (timestamp?: string | null) => {
  if (!timestamp) {
    return 'No live ping';
  }

  const diffMs = Date.now() - new Date(timestamp).getTime();
  if (diffMs < 60000) {
    return 'moments ago';
  }
  if (diffMs < 3600000) {
    const minutes = Math.round(diffMs / 60000);
    return `${minutes} min ago`;
  }
  const hours = Math.round(diffMs / 3600000);
  return `${hours} hr${hours > 1 ? 's' : ''} ago`;
};

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
  const [securityOfficers, setSecurityOfficers] = useState<any[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [locationProvider, setLocationProvider] = useState<'gps' | 'enhanced' | null>(null);
  const locationRequestOptions = useRef({
    enableHighAccuracy: true,
    timeout: 25000,
    maximumAge: 15000,
    distanceFilter: 0,
  }).current;
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

  const requestPosition = useCallback(
    (provider: 'legacy' | 'enhanced') =>
      new Promise<Location>((resolve, reject) => {
        const getter =
          provider === 'enhanced'
            ? GeolocationService.getCurrentPosition
            : Geolocation.getCurrentPosition;

        getter(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => reject({...error, provider}),
          {
            ...locationRequestOptions,
            forceRequestLocation: provider === 'enhanced',
            showLocationDialog: provider === 'enhanced',
          },
        );
      }),
    [locationRequestOptions],
  );

  const handleLocationSuccess = useCallback(
    (location: Location, providerLabel: 'gps' | 'enhanced') => {
      setUserLocation(location);
      setLocationProvider(providerLabel);
      loadNearbyHelp(location);
      loadSecurityOfficers(location);
      if (user?.id && isPremium) {
        loadGeofences();
      }
      setLoading(false);

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          800,
        );
      }
    },
    [isPremium, loadGeofences, loadSecurityOfficers, loadNearbyHelp, user],
  );

  const showPermissionAlert = useCallback((config: {
    title: string;
    message: string;
    buttons: Array<{text: string; style?: 'default' | 'cancel' | 'destructive'; onPress: () => void}>;
    type?: 'error' | 'success' | 'info' | 'warning';
  }) => {
    setAlertConfig({
      title: config.title,
      message: config.message,
      type: config.type ?? 'warning',
      buttons: config.buttons,
    });
    setAlertVisible(true);
  }, []);

  const handleLocationFailure = useCallback(
    async (error: any) => {
      console.error('Location error:', error);
      setLoading(false);

      if (Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (!hasPermission && error.code === 1) {
          showPermissionAlert({
            title: 'Location Permission Required',
            message: 'Please enable location permission in settings to see nearby help.',
            buttons: [
              {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                  setAlertVisible(false);
                },
              },
              {text: 'Retry', onPress: () => requestLocationPermission()},
            ],
          });
          return;
        }

        if (error.code === 2) {
          showPermissionAlert({
            title: 'Location Services Off',
            message: 'Turn on device location or GPS for accurate tracking.',
            buttons: [
              {text: 'Dismiss', style: 'cancel', onPress: () => setAlertVisible(false)},
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                  setAlertVisible(false);
                },
              },
              {text: 'Retry', onPress: () => requestLocationPermission()},
            ],
          });
          return;
        }
      } else if (error.code === 1) {
        showPermissionAlert({
          title: 'Location Permission Required',
          message: 'Please enable location permission in settings.',
          buttons: [
            {text: 'Cancel', style: 'cancel', onPress: () => setAlertVisible(false)},
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
                setAlertVisible(false);
              },
            },
          ],
        });
        return;
      }

      // Generic warning
      showPermissionAlert({
        title: 'Unable to determine location',
        message: error?.message || 'No location provider available. Please ensure GPS is enabled and try again.',
        buttons: [
          {text: 'OK', style: 'cancel', onPress: () => setAlertVisible(false)},
          {text: 'Retry', onPress: () => requestLocationPermission()},
        ],
        type: 'error',
      });
    },
    [showPermissionAlert],
  );

  const getCurrentLocation = useCallback(async () => {
    const tryOrder: Array<'legacy' | 'enhanced'> =
      Platform.OS === 'android' ? ['enhanced', 'legacy'] : ['legacy', 'enhanced'];

    for (const provider of tryOrder) {
      try {
        if (Platform.OS !== 'ios') {
          await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        } else if (provider === 'enhanced') {
          await GeolocationService.requestAuthorization?.('whenInUse');
        } else {
          await Geolocation.requestAuthorization();
        }

        const location = await requestPosition(provider);
        handleLocationSuccess(location, provider === 'enhanced' ? 'enhanced' : 'gps');
        return;
      } catch (error) {
        console.warn(
          provider === 'enhanced'
            ? 'Enhanced provider failed, falling back to legacy GPS'
            : 'Primary GPS provider failed, retrying with enhanced provider',
          error,
        );
      }
    }

    handleLocationFailure({
      code: 2,
      message: 'Unable to determine location using available providers',
    });
  }, [handleLocationFailure, handleLocationSuccess, requestPosition]);

  const requestLocationPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        // Check if permission is already granted
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        
        if (hasPermission) {
          setLocationPermissionGranted(true);
          if (Platform.OS === 'ios') {
            try {
              await Geolocation.requestAuthorization();
            } catch (authError) {
              console.warn('Geolocation authorization error:', authError);
            }
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
  }, [getCurrentLocation]);

  useEffect(() => {
    requestLocationPermission();
  }, [requestLocationPermission]);

  const helpLegendData = [
    {key: 'hospital', label: 'Hospital', icon: 'local-hospital', color: '#DC2626'},
    {key: 'police', label: 'Police', icon: 'local-police', color: '#1D4ED8'},
    {key: 'fire', label: 'Fire', icon: 'local-fire-department', color: '#F59E0B'},
    {key: 'pharmacy', label: 'Pharmacy', icon: 'local-pharmacy', color: '#10B981'},
    {key: 'clinic', label: 'Clinic', icon: 'medical-services', color: '#8B5CF6'},
  ];

  const loadSecurityOfficers = useCallback(async (location: Location) => {
    if (!location) return;
    setLoadingOfficers(true);
    try {
      const response = await apiService.getSecurityOfficers(location.latitude, location.longitude);
      const officers = Array.isArray(response?.officers) ? response.officers : [];
      setSecurityOfficers(officers);
    } catch (error) {
      console.error('Failed to load security officers:', error);
      setSecurityOfficers([]);
    } finally {
      setLoadingOfficers(false);
    }
  }, [user]);

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

  const loadGeofences = useCallback(async () => {
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
  }, [user]);

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

  const handleOfficerPress = (officer: any) => {
    const distanceText = officer.distance_km ? `${officer.distance_km} km away` : null;
    const batteryText =
      typeof officer.battery_level === 'number' ? `Battery ${officer.battery_level}%` : null;
    const lastSeenText = officer.last_seen_at ? `Last seen ${formatRelativeTime(officer.last_seen_at)}` : null;
    const statusText = officer.is_on_duty ? 'On duty' : 'Off duty';

    const message = [statusText, officer.geofence?.name, distanceText, batteryText, lastSeenText]
      .filter(Boolean)
      .join('\n');

    const buttons: Array<{text: string; onPress: () => void; style?: 'default' | 'cancel' | 'destructive'}> = [
      {text: 'Close', style: 'cancel', onPress: () => setAlertVisible(false)},
    ];

    if (officer.contact) {
      buttons.push({
        text: 'Call Officer',
        onPress: () => {
          Linking.openURL(`tel:${officer.contact}`).catch(() => {
            setAlertConfig({
              title: 'Error',
              message: 'Could not start call',
              type: 'error',
              buttons: [{text: 'OK', onPress: () => setAlertVisible(false)}],
            });
            setAlertVisible(true);
          });
          setAlertVisible(false);
        },
      });
    }

    setAlertConfig({
      title: officer.name,
      message,
      type: 'info',
      buttons,
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
              <Text style={[styles.sectionHeading, {color: colors.text}]}>Emergency Services</Text>
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

          {securityOfficers.length > 0 && (
            <View style={[styles.helpListContainer, {marginTop: 32}]}>
              <Text style={[styles.sectionHeading, {color: colors.text}]}>Security Officers</Text>
              {securityOfficers.map((officer) => (
                <TouchableOpacity
                  key={`officer-list-${officer.id}`}
                  style={[styles.helpListItem, {backgroundColor: colors.card, borderColor: colors.border}]}
                  onPress={() => handleOfficerPress(officer)}
                  activeOpacity={0.7}>
                  <View style={[styles.helpListIcon, {backgroundColor: '#F97316'}]}>
                    <MaterialIcons name="shield" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.helpListContent}>
                    <Text style={[styles.helpListName, {color: colors.text}]}>{officer.name}</Text>
                    {officer.geofence?.name && (
                      <Text style={[styles.helpListAddress, {color: colors.text}]}>{officer.geofence.name}</Text>
                    )}
                    <Text style={[styles.helpListDistance, {color: colors.text}]}>
                      {officer.distance_km ? `${officer.distance_km} km • ` : ''}
                      {formatRelativeTime(officer.last_seen_at)}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={colors.text} />
                </TouchableOpacity>
              ))}
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
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
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
            mapType="standard"
            loadingEnabled={true}
            loadingBackgroundColor="#0F172A"
            loadingIndicatorColor="#2563EB">
          
          {/* OpenStreetMap tile layer */}
          <MapTileLayer maxZoom={19} zIndex={-1}>
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

            {/* Security officer markers */}
            {securityOfficers
              .filter((officer) => officer.location?.latitude && officer.location?.longitude)
              .map((officer) => (
                <Marker
                  key={`officer-${officer.id}`}
                  coordinate={{
                    latitude: officer.location.latitude,
                    longitude: officer.location.longitude,
                  }}
                  title={officer.name}
                  description={officer.geofence?.name || 'Security Officer'}
                  onPress={() => handleOfficerPress(officer)}>
                  <View style={styles.officerMarker}>
                    <MaterialIcons name="shield" size={22} color="#FFFFFF" />
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
          </MapTileLayer>
          </MapView>
        </View>

        {/* Floating action button to center on user location */}
        <TouchableOpacity
          style={[styles.centerButton, {backgroundColor: colors.primary}]}
          onPress={centerOnUserLocation}
          activeOpacity={0.8}>
          <MaterialIcons name="my-location" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Officer panel */}
        {securityOfficers.length > 0 && (
          <View style={[styles.officerPanel, {backgroundColor: colors.card}]}>
            <View style={styles.officerPanelHeader}>
              <Text style={[styles.officerPanelTitle, {color: colors.text}]}>
                Nearby Security Officers
              </Text>
              {locationProvider && (
                <Text style={styles.providerBadge}>
                  {locationProvider === 'gps' ? 'GPS lock' : 'Enhanced positioning'}
                </Text>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.officerChipRow}>
              {securityOfficers.slice(0, 5).map((officer) => (
                <TouchableOpacity
                  key={`officer-chip-${officer.id}`}
                  style={styles.officerChip}
                  activeOpacity={0.8}
                  onPress={() => handleOfficerPress(officer)}>
                  <View style={styles.officerChipIcon}>
                    <MaterialIcons name="shield" size={18} color="#FFFFFF" />
                  </View>
                  <View style={styles.officerChipTextWrapper}>
                    <Text style={styles.officerChipName}>{officer.name}</Text>
                    <Text style={styles.officerChipMeta}>
                      {officer.distance_km ? `${officer.distance_km} km` : 'On call'} •{' '}
                      {formatRelativeTime(officer.last_seen_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {nearbyHelp.length > 0 && (
          <View style={[styles.legendCard, {backgroundColor: colors.card}]}>
            <Text style={[styles.legendTitle, {color: colors.text}]}>Nearby Help</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.legendItems}>
              {helpLegendData.map((item) => (
                <View key={item.key} style={styles.legendItem}>
                  <View style={[styles.legendIcon, {backgroundColor: item.color}]}>
                    <MaterialIcons name={item.icon as any} size={16} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.legendText, {color: colors.text}]}>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        {loadingOfficers && (
          <View style={styles.officerLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.officerLoadingText, {color: colors.text}]}>Syncing officer locations…</Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
    minHeight: 360,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
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
  officerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#F97316',
  },
  centerButton: {
    position: 'absolute',
    bottom: 180,
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
  legendCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 8,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontSize: 13,
  },
  officerPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 130,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  officerPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  officerPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  providerBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  officerChipRow: {
    gap: 12,
    paddingRight: 16,
  },
  officerChip: {
    minWidth: 200,
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  officerChipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officerChipTextWrapper: {
    flex: 1,
  },
  officerChipName: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  officerChipMeta: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  officerLoading: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 90,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
  },
  officerLoadingText: {
    fontSize: 12,
    color: '#F8FAFC',
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
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
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
