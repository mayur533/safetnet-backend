import React, {useMemo, useState, useEffect, useRef} from 'react';
import {View, Text, ScrollView, TouchableOpacity, RefreshControl, Switch, StyleSheet, ActivityIndicator} from 'react-native';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';
import {MapView, Circle, Marker, mapsModuleAvailable} from '../../utils/mapComponents';

const GeofenceAreaScreen = () => {
  const {isPremium, requirePremium} = useSubscription();
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGeofenceIndex, setSelectedGeofenceIndex] = useState(0);
  const mapRef = useRef<MapView>(null);

  // Load geofences from API
  useEffect(() => {
    if (user?.id && isPremium) {
      loadGeofences();
    }
  }, [user, isPremium]);

  const loadGeofences = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const data = await apiService.getGeofences(parseInt(user.id));
      // Transform API response to geofences format
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
      if (transformedGeofences.length > 0) {
        setSelectedGeofenceIndex(0);
      }
    } catch (error) {
      console.error('Failed to load geofences:', error);
      setGeofences([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGeofences();
    setRefreshing(false);
  };

  const premiumDisabled = useMemo(() => !isPremium, [isPremium]);

  const selectedGeofence = geofences[selectedGeofenceIndex] || null;
  const hasMapPreview = isPremium && mapsModuleAvailable && geofences.length > 0;

  const getRegionForGeofence = (geofence: any) => {
    if (!geofence?.center) {
      return {
        latitude: 0,
        longitude: 0,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }
    return {
      latitude: geofence.center.lat,
      longitude: geofence.center.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  };

  const handleSelectGeofence = (geofence: any, index: number) => {
    setSelectedGeofenceIndex(index);
    if (hasMapPreview && geofence?.center && mapRef.current) {
      mapRef.current.animateToRegion(getRegionForGeofence(geofence), 600);
    }
  };

  const toggleGeofence = (id: string) => {
    if (premiumDisabled) {
      requirePremium('Geo-fencing alerts are part of the Premium plan. Upgrade to manage safe zones.');
      return;
    }
    setGeofences(
      geofences.map((geo) => (geo.id === id ? {...geo, isActive: !geo.isActive} : geo))
    );
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Geofence Areas</Text>
            <TouchableOpacity
              style={[styles.addButton, premiumDisabled && styles.addButtonDisabled]}
              onPress={() => {
                if (premiumDisabled) {
                  requirePremium('Geo-fencing alerts are part of the Premium plan. Upgrade to manage safe zones.');
                  return;
                }
              }}
              activeOpacity={0.8}
              disabled={premiumDisabled}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {loading && isPremium ? (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.mapPlaceholderText}>Loading your geofences…</Text>
            </View>
          ) : hasMapPreview && selectedGeofence ? (
            <View style={styles.mapWrapper}>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={getRegionForGeofence(selectedGeofence)}
                scrollEnabled={true}
                zoomEnabled={true}>
                {geofences
                  .filter((geo) => geo.center && geo.center.lat && geo.center.lng)
                  .map((geo, index) => {
                    const isSelected = index === selectedGeofenceIndex;
                    const fillColor = isSelected ? '#2563EB33' : '#94A3B833';
                    const strokeColor = isSelected ? '#2563EB' : '#94A3B8';
                    return (
                      <React.Fragment key={`geo-shape-${geo.id}`}>
                        <Circle
                          center={{latitude: geo.center.lat, longitude: geo.center.lng}}
                          radius={geo.radius || 100}
                          strokeColor={strokeColor}
                          fillColor={fillColor}
                          strokeWidth={isSelected ? 3 : 1}
                        />
                        <Marker
                          coordinate={{latitude: geo.center.lat, longitude: geo.center.lng}}
                          title={geo.name}
                          description={`Radius ${geo.radius}m`}
                        />
                      </React.Fragment>
                    );
                  })}
              </MapView>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderTitle}>
                {premiumDisabled ? 'Upgrade to see your safe zones on the map' : 'Map preview unavailable'}
              </Text>
              <Text style={styles.mapPlaceholderText}>
                {premiumDisabled
                  ? 'Premium members can visualize and edit their geofence coverage directly on the map.'
                  : 'Install react-native-maps or update Google Play Services to enable the preview.'}
              </Text>
            </View>
          )}

          {geofences.map((geofence, index) => {
            const isSelected = index === selectedGeofenceIndex;
            return (
              <TouchableOpacity
                key={geofence.id}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  premiumDisabled && styles.cardDisabled,
                ]}
                activeOpacity={0.9}
                onPress={() => handleSelectGeofence(geofence, index)}
                disabled={premiumDisabled}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{geofence.name}</Text>
                  <Text style={styles.cardSubtitle}>Radius: {geofence.radius}m</Text>
                  <Text style={styles.cardCoordinates}>
                    📍 {geofence.center.lat.toFixed(4)}, {geofence.center.lng.toFixed(4)}
                  </Text>
                </View>
                <Switch
                  value={geofence.isActive && !premiumDisabled}
                  onValueChange={() => toggleGeofence(geofence.id)}
                  trackColor={{false: '#D1D5DB', true: '#10B981'}}
                  thumbColor={geofence.isActive ? '#FFFFFF' : '#9CA3AF'}
                  disabled={premiumDisabled}
                />
              </View>
                {isSelected && <Text style={styles.selectedBadge}>Selected</Text>}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionPrimary, premiumDisabled && styles.actionDisabled]}
                  onPress={() => {
                    if (premiumDisabled) {
                      requirePremium('Upgrade to edit geo-fence zones.');
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={premiumDisabled}>
                  <Text style={[styles.actionText, styles.actionPrimaryText]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionDanger, premiumDisabled && styles.actionDisabled]}
                  onPress={() => {
                    if (premiumDisabled) {
                      requirePremium('Upgrade to manage geo-fence zones.');
                      return;
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={premiumDisabled}>
                  <Text style={[styles.actionText, styles.actionDangerText]}>Delete</Text>
                </TouchableOpacity>
              </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {premiumDisabled && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.overlayCard}>
            <Text style={styles.overlayTitle}>Premium Feature</Text>
            <Text style={styles.overlaySubtitle}>
              Geo-fencing alerts keep your trusted circle updated when you arrive or leave safe zones. Upgrade to
              unlock this protection.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default GeofenceAreaScreen;

const styles = StyleSheet.create({
  wrapper: {flex: 1, backgroundColor: '#F9FAFB'},
  scroll: {flex: 1},
  inner: {paddingHorizontal: 24, paddingVertical: 16},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  title: {fontSize: 24, fontWeight: 'bold', color: '#111827'},
  addButton: {backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9},
  addButtonDisabled: {backgroundColor: '#9CA3AF'},
  addButtonText: {color: '#FFFFFF', fontWeight: '600'},
  mapWrapper: {height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 16},
  map: {flex: 1},
  mapPlaceholder: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#EEF2FF',
    marginBottom: 16,
  },
  mapPlaceholderTitle: {fontSize: 16, fontWeight: '700', color: '#1E3A8A', marginBottom: 8},
  mapPlaceholderText: {fontSize: 14, color: '#1E3A8A', lineHeight: 20},
  card: {backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB'},
  cardSelected: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDisabled: {opacity: 0.8},
  cardHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  cardInfo: {flex: 1},
  cardTitle: {color: '#111827', fontSize: 18, fontWeight: '600', marginBottom: 4},
  cardSubtitle: {color: '#6B7280', fontSize: 14, marginBottom: 4},
  cardCoordinates: {color: '#6B7280', fontSize: 12},
  cardActions: {marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', flexDirection: 'row', gap: 8},
  actionButton: {flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center'},
  actionPrimary: {backgroundColor: '#EFF6FF'},
  actionPrimaryText: {color: '#2563EB', fontWeight: '600'},
  actionDanger: {backgroundColor: '#FEF2F2'},
  actionDangerText: {color: '#DC2626', fontWeight: '600'},
  actionText: {fontSize: 14},
  actionDisabled: {opacity: 0.6},
  selectedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  overlay: {position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 24, justifyContent: 'flex-end'},
  overlayCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.88)',
    borderRadius: 16,
    padding: 20,
  },
  overlayTitle: {color: '#F9FAFB', fontSize: 18, fontWeight: '700', marginBottom: 8},
  overlaySubtitle: {color: '#E5E7EB', fontSize: 14, lineHeight: 20},
});
