import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, TouchableOpacity} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAuthStore} from '../../stores/authStore';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {apiService} from '../../services/apiService';
import {
  MapView,
  Circle,
  Marker,
  UrlTile,
  mapsModuleAvailable,
  PROVIDER_DEFAULT,
} from '../../utils/mapComponents';
import MapTileLayer from '../../utils/MapTileLayer';

type Geofence = {
  id: string;
  name: string;
  radius: number;
  center: {lat: number; lng: number};
  isActive: boolean;
};

const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

const GeofenceAreaScreen = () => {
  const user = useAuthStore((state) => state.user);
  const {isPremium, requirePremium} = useSubscription();
  const mapRef = useRef<MapView>(null);

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transformedRegion = useMemo(() => {
    const first = geofences.find((geo) => geo.center.lat && geo.center.lng);
    if (first) {
      return {
        latitude: first.center.lat,
        longitude: first.center.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return DEFAULT_REGION;
  }, [geofences]);

  const loadGeofences = useCallback(async () => {
    if (!user?.id) {
      return;
    }
    if (!isPremium) {
      setGeofences([]);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await apiService.getGeofences(parseInt(user.id, 10));
      const next: Geofence[] = Array.isArray(data)
        ? data.map((geo: any) => ({
            id: geo.id?.toString() || geo.name,
            name: geo.name || 'Unnamed safe zone',
            radius: geo.radius_meters || geo.radius || 100,
            center: geo.center_location
              ? {
                  lat: geo.center_location.latitude || geo.center_location.lat || 0,
                  lng: geo.center_location.longitude || geo.center_location.lng || 0,
                }
              : {lat: 0, lng: 0},
            isActive: geo.is_active !== false,
          }))
        : [];
      setGeofences(next);

      if (next.length > 0 && mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: next[0].center.lat || DEFAULT_REGION.latitude,
            longitude: next[0].center.lng || DEFAULT_REGION.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          },
          600,
        );
      }
    } catch (error) {
      console.error('Failed to load geofences:', error);
      setErrorMessage('Failed to load geofences. Check your connection and try again.');
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isPremium]);

  useEffect(() => {
    loadGeofences();
  }, [loadGeofences]);

  const renderMapContent = () => {
    if (!mapsModuleAvailable) {
      return (
        <View style={styles.placeholder}>
          <MaterialIcons name="map" size={48} color="#6B7280" />
          <Text style={styles.placeholderTitle}>Map component missing</Text>
          <Text style={styles.placeholderText}>Install react-native-maps to view your safe zones.</Text>
        </View>
      );
    }

    if (!isPremium) {
      return (
        <View style={styles.placeholder}>
          <MaterialIcons name="lock" size={48} color="#2563EB" />
          <Text style={styles.placeholderTitle}>Premium required</Text>
          <Text style={styles.placeholderText}>
            Upgrade to Premium to view geofences and automatic safe-zone alerts.
          </Text>
          <TouchableOpacity style={styles.upgradeButton} onPress={() => requirePremium()}>
            <Text style={styles.upgradeButtonText}>See plans</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_DEFAULT}
          mapType="standard"
          initialRegion={transformedRegion}
          showsUserLocation={true}
          loadingEnabled={true}
          loadingBackgroundColor="#0F172A"
          loadingIndicatorColor="#2563EB">
          <MapTileLayer maxZoom={19} zIndex={-1}>
            {geofences
              .filter((geo) => geo.center.lat && geo.center.lng)
              .map((geo) => {
                const strokeColor = geo.isActive ? '#2563EB' : '#6B7280';
                const fillColor = geo.isActive ? '#2563EB33' : '#94A3B833';
                return (
                  <React.Fragment key={geo.id}>
                    <Circle
                      center={{latitude: geo.center.lat, longitude: geo.center.lng}}
                      radius={geo.radius}
                      strokeColor={strokeColor}
                      fillColor={fillColor}
                      strokeWidth={2}
                    />
                    <Marker
                      coordinate={{latitude: geo.center.lat, longitude: geo.center.lng}}
                      title={geo.name}
                      description={`Radius ${geo.radius} m`}
                    />
                  </React.Fragment>
                );
              })}
          </MapTileLayer>
        </MapView>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Geofence legend</Text>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, {backgroundColor: '#2563EB'}]} />
            <Text style={styles.legendText}>Active safe zone</Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, {backgroundColor: '#6B7280'}]} />
            <Text style={styles.legendText}>Paused safe zone</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadGeofences} activeOpacity={0.85}>
          <MaterialIcons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.refreshLabel}>Reload geofences</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderMapContent()}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={styles.loadingText}>Syncing safe zones…</Text>
        </View>
      )}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity onPress={loadGeofences}>
            <Text style={styles.errorRetry}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default GeofenceAreaScreen;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000'},
  map: {flex: 1},
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#0F172A',
  },
  placeholderTitle: {marginTop: 16, fontSize: 18, fontWeight: '600', color: '#F8FAFC'},
  placeholderText: {marginTop: 8, fontSize: 14, textAlign: 'center', color: '#CBD5F5'},
  upgradeButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  upgradeButtonText: {color: '#FFFFFF', fontWeight: '600'},
  legendCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
  },
  legendTitle: {color: '#F8FAFC', fontSize: 16, fontWeight: '600', marginBottom: 12},
  legendRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  legendDot: {width: 12, height: 12, borderRadius: 999, marginRight: 8},
  legendText: {color: '#E2E8F0', fontSize: 14},
  refreshButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 99, 235, 0.9)',
  },
  refreshLabel: {color: '#FFFFFF', fontWeight: '600'},
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {color: '#F8FAFC', fontWeight: '500'},
  errorBanner: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    padding: 14,
  },
  errorText: {color: '#FEE2E2', fontWeight: '600', marginBottom: 8},
  errorRetry: {color: '#FFFFFF', fontWeight: '700'},
});
