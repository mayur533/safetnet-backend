import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert as RNAlert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useGeofenceStore } from '../../store/geofenceStore';
import { Geofence } from '../../types/alert.types';
import { UserInArea } from '../../api/services/geofenceService';
import { useColors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { useAppSelector } from '../../store/hooks';

const { width: screenWidth } = Dimensions.get('window');

export const GeofenceManagementScreen = () => {
  const colors = useColors();
  const {
    geofences,
    assignedGeofence,
    usersInArea,
    isLoading,
    error,
    fetchGeofences,
    fetchAssignedGeofence,
    fetchUsersInArea,
    isInsideGeofence,
    lastBoundaryCrossTime
  } = useGeofenceStore();

  // Get officer from auth store
  const officer = useAppSelector(state => state.auth.officer);
  const officerId = officer?.id;

  // Debug log
  console.log("FINAL OFFICER OBJECT:", officer);

  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapKeyRef = useRef(0);

  useEffect(() => {
    console.log("AUTH STATE:", officer);

    if (!officerId) {
      console.log("⏳ Waiting for officer data...");
      return;
    }

    console.log("✅ Officer ready:", officerId);

    fetchGeofences(officerId.toString());
    fetchAssignedGeofence(officerId.toString());

  }, [officerId]);

  // Fetch users in area when assigned geofence changes
  useEffect(() => {
    if (assignedGeofence) {
      fetchUsersInArea(assignedGeofence.id);
      setSelectedGeofence(assignedGeofence);
    }
  }, [assignedGeofence, fetchUsersInArea]);

  // Handle geofence selection
  const handleGeofenceSelect = (geofence: Geofence) => {
    setSelectedGeofence(geofence);
    fetchUsersInArea(geofence.id);
    mapKeyRef.current += 1; // Force map remount
  };

  // Handle map view toggle
  const handleToggleMap = () => {
    setShowMap(!showMap);
    if (!showMap) {
      mapKeyRef.current += 1; // Force map remount when showing
    }
  };

  // Get geofence center coordinates
  const getGeofenceCenter = (geofence: Geofence) => {
    console.log("🎯 UI LAYER - getGeofenceCenter called:", {
      name: geofence.name,
      type: geofence.geofence_type,
      center_point: geofence.center_point,
      center_latitude: geofence.center_latitude,
      center_longitude: geofence.center_longitude
    });
    
    console.log("🔍 FULL GEOFENCE OBJECT:", geofence);
    console.log("🎯 BACKEND CENTER_POINT:", geofence.center_point);
    
    if (geofence.center_point && Array.isArray(geofence.center_point) && geofence.center_point.length === 2) {
      // Use backend center_point directly: [latitude, longitude]
      const center = {
        latitude: geofence.center_point[0],
        longitude: geofence.center_point[1]
      };
      console.log("✅ Using backend center_point:", center);
      return center;
    }
    
    // Fallback to legacy center fields for backward compatibility
    if (geofence.center_latitude && geofence.center_longitude) {
      const center = {
        latitude: geofence.center_latitude,
        longitude: geofence.center_longitude
      };
      console.log("⚠️ Using fallback center fields:", center);
      return center;
    }
    
    console.log("❌ No valid center data found");
    return { latitude: 0, longitude: 0 };
  };

  // Get polygon coordinates for map
  const getPolygonCoordinates = (geofence: Geofence) => {
    console.log("🎯 UI LAYER - getPolygonCoordinates called:", {
      name: geofence.name,
      type: geofence.geofence_type,
      polygon_json_type: typeof geofence.polygon_json,
      polygon_json_value: geofence.polygon_json
    });
    
    if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      try {
        // polygon_json is already an array from backend
        const rawPolygon = geofence.polygon_json;
        
        console.log("📍 RAW POLYGON FROM API:", {
          name: geofence.name,
          rawPolygon: rawPolygon,
          length: rawPolygon.length,
          firstPoint: rawPolygon[0],
          lastPoint: rawPolygon[rawPolygon.length - 1],
          sampleFormat: rawPolygon.length > 0 && Array.isArray(rawPolygon[0]) ? 
            `[${rawPolygon[0][0]}, ${rawPolygon[0][1]}]` : 'invalid'
        });
        
        // Detect coordinate format by checking if first point looks like valid lat/lng
        let isLatFirst = true; // Assume [lat, lng] by default
        if (rawPolygon.length > 0 && Array.isArray(rawPolygon[0])) {
          const [first, second] = rawPolygon[0];
          // Latitude should be between -90 and 90, Longitude between -180 and 180
          if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
            isLatFirst = false; // It's [lng, lat] format
            console.log("🔄 DETECTED COORDINATE FORMAT: [lng, lat] - will swap");
          } else {
            console.log("✅ DETECTED COORDINATE FORMAT: [lat, lng] - will use directly");
          }
        }
        
        // Convert coordinates to {latitude, longitude} format
        let convertedCoords = rawPolygon.map(([coord1, coord2]) => {
          if (isLatFirst) {
            // Already [lat, lng] format
            return {
              latitude: coord1,
              longitude: coord2
            };
          } else {
            // [lng, lat] format - swap to [lat, lng]
            return {
              latitude: coord2,
              longitude: coord1
            };
          }
        });
        
        // Ensure polygon is closed (first point equals last point)
        if (convertedCoords.length > 0) {
          const firstPoint = convertedCoords[0];
          const lastPoint = convertedCoords[convertedCoords.length - 1];
          
          if (firstPoint.latitude !== lastPoint.latitude || firstPoint.longitude !== lastPoint.longitude) {
            console.log("🔒 CLOSING POLYGON: Adding first point as last point");
            convertedCoords.push({...firstPoint});
          } else {
            console.log("✅ POLYGON ALREADY CLOSED: First and last points match");
          }
        }
        
        console.log("🗺️ CONVERTED COORDINATES FOR MAP:", {
          name: geofence.name,
          coordinateCount: convertedCoords.length,
          firstCoordinate: convertedCoords[0],
          lastCoordinate: convertedCoords[convertedCoords.length - 1],
          allCoordinates: convertedCoords,
          format: convertedCoords.length > 0 ? 
            `[{latitude: ${convertedCoords[0].latitude}, longitude: ${convertedCoords[0].longitude}}]` : 'empty',
          isClosed: convertedCoords.length > 0 && 
            JSON.stringify(convertedCoords[0]) === JSON.stringify(convertedCoords[convertedCoords.length - 1])
        });
        
        return convertedCoords;
      } catch (error) {
        console.error('❌ UI - Failed to process polygon coordinates for map:', error);
        return [];
      }
    }
    console.log("⚠️ UI - No polygon coordinates available for map");
    return [];
  };

  // Calculate optimal zoom level
  const getOptimalZoom = (geofence: Geofence) => {
    if (geofence.geofence_type === 'circle' && geofence.radius) {
      // For circular geofences, zoom based on radius
      const radiusKm = geofence.radius / 1000;
      if (radiusKm <= 0.1) return 16;
      if (radiusKm <= 0.5) return 14;
      if (radiusKm <= 2) return 12;
      if (radiusKm <= 10) return 10;
      return 8;
    } else if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      // For polygons, use a default zoom
      return 15;
    }
    return 12;
  };

  // Get user markers for map
  const getUserMarkers = () => {
    return usersInArea.map(user => ({
      id: user.user_id,
      latitude: user.current_latitude,
      longitude: user.current_longitude,
      title: user.user_name,
      description: `Last seen: ${new Date(user.last_seen).toLocaleTimeString()}`,
      icon: user.is_inside ? 'security' : 'person'
    }));
  };

  // Render geofence status
  const renderGeofenceStatus = () => {
    if (!assignedGeofence) {
      return (
        <View style={styles(colors).statusCard}>
          <Icon name="location-off" size={24} color={colors.emergencyRed} />
          <Text style={[styles(colors).statusText, { color: colors.emergencyRed }]}>
            No geofence assigned
          </Text>
        </View>
      );
    }

    const statusColor = isInsideGeofence ? colors.successGreen : colors.warningOrange;
    const statusIcon = isInsideGeofence ? 'location-on' : 'location-off';

    return (
      <View style={styles(colors).statusCard}>
        <Icon name={statusIcon} size={24} color={statusColor} />
        <View style={styles(colors).statusContent}>
          <Text style={[styles(colors).statusText, { color: statusColor }]}>
            {isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'}
          </Text>
          {lastBoundaryCrossTime > 0 && (
            <Text style={styles(colors).statusTime}>
              Last boundary cross: {new Date(lastBoundaryCrossTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  // Render geofence details
  const renderGeofenceDetails = (geofence: Geofence) => {
    const center = getGeofenceCenter(geofence);

    return (
      <View style={styles(colors).geofenceCard}>
        <View style={styles(colors).geofenceHeader}>
          <Icon name="location-on" size={24} color={colors.primary} />
          <View style={styles(colors).geofenceInfo}>
            <Text style={styles(colors).geofenceName}>{geofence.name}</Text>
            <Text style={styles(colors).geofenceType}>
              {geofence.geofence_type === 'circle' ? 'Circular' : 'Polygon'} Geofence
            </Text>
          </View>
          <View style={[
            styles(colors).statusBadge,
            { backgroundColor: geofence.status === 'active' ? colors.successGreen : colors.emergencyRed }
          ]}>
            <Text style={styles(colors).statusBadgeText}>{geofence.status}</Text>
          </View>
        </View>

        <View style={styles(colors).geofenceDetails}>
          <Text style={styles(colors).detailLabel}>Center:</Text>
          <Text style={styles(colors).detailValue}>
            {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
          </Text>

          {geofence.geofence_type === 'circle' && geofence.radius && (
            <>
              <Text style={styles(colors).detailLabel}>Radius:</Text>
              <Text style={styles(colors).detailValue}>{geofence.radius} meters</Text>
            </>
          )}

          <Text style={styles(colors).detailLabel}>Users in area:</Text>
          <Text style={styles(colors).detailValue}>{usersInArea.length}</Text>
        </View>
      </View>
    );
  };

  // Render users in area
  const renderUsersInArea = () => {
    if (usersInArea.length === 0) {
      return (
        <View style={styles(colors).emptyUsers}>
          <Icon name="people" size={48} color={colors.mediumText} />
          <Text style={styles(colors).emptyUsersText}>No users currently in this area</Text>
        </View>
      );
    }

    return usersInArea.map(user => (
      <View key={user.user_id} style={styles(colors).userCard}>
        <View style={[
          styles(colors).userStatus,
          { backgroundColor: user.is_inside ? colors.successGreen : colors.emergencyRed }
        ]} />
        <View style={styles(colors).userInfo}>
          <Text style={styles(colors).userName}>{user.user_name}</Text>
          <Text style={styles(colors).userEmail}>{user.user_email}</Text>
          <Text style={styles(colors).userLocation}>
            {user.current_latitude.toFixed(6)}, {user.current_longitude.toFixed(6)}
          </Text>
          <Text style={styles(colors).userLastSeen}>
            Last seen: {new Date(user.last_seen).toLocaleString()}
          </Text>
        </View>
        <Icon
          name={user.is_inside ? 'location-on' : 'location-off'}
          size={24}
          color={user.is_inside ? colors.successGreen : colors.emergencyRed}
        />
      </View>
    ));
  };

  if (isLoading && geofences.length === 0) {
    return (
      <View style={[styles(colors).container, styles(colors).centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles(colors).loadingText}>Loading geofence data...</Text>
      </View>
    );
  }

  // Handle empty geofences state
  if (!isLoading && geofences.length === 0) {
    return (
      <View style={[styles(colors).container, styles(colors).centered]}>
        <Icon name="location-off" size={64} color={colors.mediumText} />
        <Text style={styles(colors).emptyTitle}>No Geofence Assigned</Text>
        <Text style={styles(colors).emptyMessage}>
          You don't have any geofence assignments. Please contact your administrator.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).scrollContent}>
      {/* Header */}
      <View style={styles(colors).header}>
        <Text style={styles(colors).headerTitle}>Geofence Management</Text>
        <Text style={styles(colors).headerSubtitle}>
          Monitor assigned areas and users within boundaries
        </Text>
      </View>

      {/* Geofence Status */}
      {renderGeofenceStatus()}

      {/* Assigned Geofence */}
      {assignedGeofence && (
        <>
          <Text style={styles(colors).sectionTitle}>Assigned Geofence</Text>
          {renderGeofenceDetails(assignedGeofence)}
        </>
      )}

      {/* Map Toggle */}
      {selectedGeofence && (
        <TouchableOpacity
          style={styles(colors).mapToggleButton}
          onPress={handleToggleMap}
          activeOpacity={0.7}
        >
          <Icon name={showMap ? 'map' : 'location-on'} size={24} color={colors.white} />
          <Text style={styles(colors).mapToggleText}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Map View */}
      {showMap && selectedGeofence && (
        <View style={styles(colors).mapContainer}>
          {(() => {
            const center = getGeofenceCenter(selectedGeofence);
            const polygonCoords = getPolygonCoordinates(selectedGeofence);
            const zoom = getOptimalZoom(selectedGeofence);
            
            console.log("🗺️ MAP INPUT - FINAL VALIDATION:", {
              geofenceName: selectedGeofence.name,
              geofenceType: selectedGeofence.geofence_type,
              centerCoords: center,
              zoomLevel: zoom,
              polygonCoordinates: polygonCoords,
              polygonCount: polygonCoords.length,
              firstPolygonCoord: polygonCoords[0],
              lastPolygonCoord: polygonCoords[polygonCoords.length - 1],
              mapDataFormat: {
                latitude: typeof center.latitude,
                longitude: typeof center.longitude,
                polygonFormat: polygonCoords.length > 0 ? 
                  `[{latitude: ${typeof polygonCoords[0].latitude}, longitude: ${typeof polygonCoords[0].longitude}}]` : 
                  'empty'
              },
              isDataValid: polygonCoords.length > 0 && 
                polygonCoords.every(coord => 
                  typeof coord.latitude === 'number' && 
                  typeof coord.longitude === 'number'
                )
            });
            
            return null;
          })()}
          <LeafletMap
            key={`geofence-map-${mapKeyRef.current}`}
            latitude={getGeofenceCenter(selectedGeofence).latitude}
            longitude={getGeofenceCenter(selectedGeofence).longitude}
            zoom={getOptimalZoom(selectedGeofence)}
            height={400}
            polygonCoordinates={getPolygonCoordinates(selectedGeofence)}
          />
        </View>
      )}

      {/* Users in Area */}
      <Text style={styles(colors).sectionTitle}>Users in Area ({usersInArea.length})</Text>
      <View style={styles(colors).usersContainer}>
        {renderUsersInArea()}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles(colors).errorCard}>
          <Icon name="error" size={20} color={colors.emergencyRed} />
          <Text style={styles(colors).errorText}>{error}</Text>
          <TouchableOpacity
            style={styles(colors).errorDismiss}
            onPress={() => useGeofenceStore.getState().clearError()}
          >
            <Icon name="close" size={16} color={colors.mediumText} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.mediumText,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  statusText: {
    ...typography.body,
    fontWeight: '600',
  },
  statusTime: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    color: colors.darkText,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  geofenceCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  geofenceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  geofenceName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.darkText,
  },
  geofenceType: {
    ...typography.caption,
    color: colors.mediumText,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  geofenceDetails: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 8,
    padding: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.darkText,
    fontFamily: 'monospace',
  },
  mapToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapToggleText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usersContainer: {
    marginBottom: spacing.lg,
  },
  emptyUsers: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  emptyUsersText: {
    ...typography.body,
    color: colors.mediumText,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyUsersLoadingText: {
    ...typography.body,
    color: colors.mediumText,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    color: colors.mediumText,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    shadowColor: colors.darkText,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.darkText,
  },
  userEmail: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: spacing.xs,
  },
  userLocation: {
    ...typography.caption,
    color: colors.darkText,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  userLastSeen: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: spacing.xs,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGrayBg,
    borderRadius: 8,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.emergencyRed,
  },
  errorText: {
    ...typography.caption,
    color: colors.emergencyRed,
    flex: 1,
    marginLeft: spacing.sm,
  },
  errorDismiss: {
    padding: spacing.xs,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.mediumText,
  },
});