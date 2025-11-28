import React, {useCallback, useEffect, useMemo, useState, useRef} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useAuthStore} from '../../stores/authStore';
import {useSubscription} from '../../lib/hooks/useSubscription';
import {apiService} from '../../services/apiService';
import LeafletMap, {LeafletMapRef} from '../../components/maps/LeafletMap';
import {refreshGeofences} from '../../services/geofenceMonitoringService';

type Geofence = {
  id: string;
  name: string;
  polygon?: Array<[number, number]>; // Array of [lat, lng] pairs for polygon geofences
  radius?: number; // For backward compatibility with circle geofences
  center: {lat: number; lng: number};
  isActive: boolean;
  color?: string;
  description?: string;
};

// Color palette for geofences (same as SafeFleet admin)
const GEOFENCE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];

const DEFAULT_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

const GeofenceAreaScreen = () => {
  const user = useAuthStore((state) => state.user);
  const {isPremium, requirePremium} = useSubscription();

  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{lat: number; lng: number} | null>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

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
      
      // Force refresh to get latest data from API (bypass cache)
      const response = await apiService.getGeofences(parseInt(user.id, 10), true);
      
      console.log('[GeofenceArea] API Response:', JSON.stringify(response, null, 2));
      
      // Handle response format: backend returns {geofences: [...]} or direct array
      const geofencesData = response?.geofences || (Array.isArray(response) ? response : []);
      
      if (!Array.isArray(geofencesData)) {
        console.warn('[GeofenceArea] Invalid response format, expected array:', geofencesData);
        setGeofences([]);
        setErrorMessage('Invalid geofence data format received from server.');
        return;
      }
      
      const next: Geofence[] = geofencesData
        .filter((geo: any) => {
          // Only include geofences with valid polygon data
          const hasValidPolygon = geo.polygon && Array.isArray(geo.polygon) && geo.polygon.length >= 3;
          if (!hasValidPolygon) {
            console.warn('[GeofenceArea] Skipping geofence with invalid polygon:', geo);
          }
          return hasValidPolygon;
        })
        .map((geo: any, idx: number) => ({
          id: geo.id?.toString() || `geofence-${idx}`,
          name: geo.name || 'Unnamed safe zone',
          polygon: geo.polygon || [], // Array of [lat, lng] pairs
          center: geo.center || {
            lat: 0,
            lng: 0,
          },
            isActive: geo.is_active !== false,
          color: geo.color || GEOFENCE_COLORS[idx % GEOFENCE_COLORS.length],
          description: geo.description || '',
        }));
      
      console.log('[GeofenceArea] Loaded geofences:', next.length);
      setGeofences(next);
      
      // Refresh geofence monitoring with updated list
      if (user?.id && isPremium) {
        const userId = parseInt(user.id, 10);
        if (!isNaN(userId)) {
          refreshGeofences(userId).catch((err) => {
            console.warn('Failed to refresh geofence monitoring:', err);
          });
        }
      }

      // Note: Map centering is now handled by LeafletMap's initialCenter prop
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

  // Store ref to LeafletMap for fitBounds calls
  const mapRef = useRef<LeafletMapRef>(null);
  
  // Zoom to geofence when clicked from legend - use fitBounds to properly zoom to polygon
  const zoomToGeofence = useCallback((geofence: Geofence) => {
    setSelectedGeofence(geofence.id);
    
    if (geofence.polygon && geofence.polygon.length >= 3) {
      // Calculate bounds from polygon
      const lats = geofence.polygon.map(p => p[0]);
      const lngs = geofence.polygon.map(p => p[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      // Calculate center for fallback
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      setMapCenter({lat: centerLat, lng: centerLng});
      
      // Use fitBounds to zoom to polygon bounds
      const bounds: [[number, number], [number, number]] = [[minLat, minLng], [maxLat, maxLng]];
      
      // Call fitBounds via ref
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds);
        }
      }, 100);
    } else if (geofence.center && geofence.center.lat && geofence.center.lng) {
      setMapCenter({lat: geofence.center.lat, lng: geofence.center.lng});
    }
  }, []);

  const renderMapContent = () => {
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

    // Use mapCenter if set, otherwise use transformedRegion
    const currentCenter = mapCenter || {
      lat: transformedRegion.latitude,
      lng: transformedRegion.longitude,
    };

    // Transform geofences to LeafletMap format with polygons
    const polygons = geofences
      .filter((geo) => geo.polygon && geo.polygon.length >= 3)
      .map((geo) => ({
        id: geo.id,
        polygon: geo.polygon,
        color: geo.color || (geo.isActive ? '#2563EB' : '#6B7280'),
        fillColor: geo.isActive 
          ? `${geo.color || '#2563EB'}33` 
          : `${geo.color || '#6B7280'}33`,
        opacity: selectedGeofence === geo.id ? 0.5 : 0.3,
        title: geo.name,
      }));

    // Markers at polygon centers
    const markers = geofences
      .filter((geo) => geo.center && geo.center.lat && geo.center.lng)
      .map((geo) => ({
        id: geo.id,
        lat: geo.center.lat,
        lng: geo.center.lng,
        title: geo.name,
        description: geo.description || '',
      }));

  return (
      <>
        <LeafletMap
          ref={mapRef}
          initialCenter={currentCenter}
          initialZoom={selectedGeofence ? 15 : 13}
          markers={markers}
          polygons={polygons}
          onMarkerPress={(marker) => {
            const geo = geofences.find(g => g.id === marker.id);
            if (geo) {
              zoomToGeofence(geo);
            }
          }}
        />

        <View style={styles.legendCard}>
          <View style={styles.legendHeader}>
            <Text style={styles.legendTitle}>Geofences (Click to zoom)</Text>
            <View style={styles.legendHeaderButtons}>
              {loading && (
                <ActivityIndicator 
                  size="small" 
                  color="#E2E8F0" 
                  style={styles.loadingSpinner}
                />
              )}
              <TouchableOpacity 
                style={styles.expandCollapseButton} 
                onPress={() => setIsLegendExpanded(!isLegendExpanded)} 
                activeOpacity={0.7}
              >
                <MaterialIcons 
                  name={isLegendExpanded ? "keyboard-arrow-down" : "keyboard-arrow-up"} 
                  size={24} 
                  color="#E2E8F0" 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.refreshIconButton} 
                onPress={loadGeofences} 
                activeOpacity={0.7}
                disabled={loading}
              >
                <MaterialIcons name="refresh" size={20} color="#E2E8F0" />
            </TouchableOpacity>
            </View>
          </View>
          {isLegendExpanded ? (
            <ScrollView style={styles.legendScroll} showsVerticalScrollIndicator={false}>
              {geofences.length === 0 ? (
                <Text style={styles.legendEmptyText}>No geofences</Text>
              ) : (
                geofences.map((geo) => (
                  <TouchableOpacity
                    key={geo.id}
                    style={[
                      styles.legendItem,
                      selectedGeofence === geo.id && styles.legendItemSelected,
                    ]}
                    onPress={() => zoomToGeofence(geo)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.legendDot,
                        {backgroundColor: geo.color || (geo.isActive ? '#2563EB' : '#6B7280')},
                      ]}
                    />
                    <View style={styles.legendItemContent}>
                      <Text style={styles.legendItemName} numberOfLines={1}>
                        {geo.name}
                      </Text>
                      <View style={styles.legendItemMeta}>
                        <Text style={[
                          styles.legendItemStatus,
                          geo.isActive ? styles.legendItemStatusActive : styles.legendItemStatusInactive,
                        ]}>
                          {geo.isActive ? 'Active' : 'Inactive'}
                        </Text>
                        {selectedGeofence === geo.id && (
                          <MaterialIcons name="gps-fixed" size={14} color="#6366f1" style={styles.legendItemIcon} />
                        )}
                      </View>
            </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : (
            <View style={styles.legendCollapsed}>
              {geofences.length === 0 ? (
                <Text style={styles.legendEmptyText}>No geofences</Text>
              ) : (
                geofences.slice(0, 2).map((geo) => (
                  <TouchableOpacity
                    key={geo.id}
                    style={[
                      styles.legendItem,
                      selectedGeofence === geo.id && styles.legendItemSelected,
                    ]}
                    onPress={() => zoomToGeofence(geo)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.legendDot,
                        {backgroundColor: geo.color || (geo.isActive ? '#2563EB' : '#6B7280')},
                      ]}
                    />
                    <View style={styles.legendItemContent}>
                      <Text style={styles.legendItemName} numberOfLines={1}>
                        {geo.name}
                      </Text>
                      <View style={styles.legendItemMeta}>
                        <Text style={[
                          styles.legendItemStatus,
                          geo.isActive ? styles.legendItemStatusActive : styles.legendItemStatusInactive,
                        ]}>
                          {geo.isActive ? 'Active' : 'Inactive'}
              </Text>
                        {selectedGeofence === geo.id && (
                          <MaterialIcons name="gps-fixed" size={14} color="#6366f1" style={styles.legendItemIcon} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
              {geofences.length > 2 && (
                <Text style={styles.legendMoreText}>
                  +{geofences.length - 2} more (tap ↑ to expand)
              </Text>
              )}
            </View>
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderMapContent()}
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
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    maxHeight: 300,
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendTitle: {color: '#F8FAFC', fontSize: 14, fontWeight: '600'},
  legendHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingSpinner: {
    marginRight: 4,
  },
  expandCollapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendScroll: {
    maxHeight: 220,
  },
  legendCollapsed: {
    maxHeight: 120,
  },
  legendMoreText: {
    color: '#9CA3AF',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  legendItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendItemContent: {
    flex: 1,
  },
  legendItemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  legendItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendItemStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  legendItemStatusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
  },
  legendItemStatusInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    color: '#9CA3AF',
  },
  legendItemIcon: {
    marginLeft: 'auto',
  },
  legendEmptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
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
