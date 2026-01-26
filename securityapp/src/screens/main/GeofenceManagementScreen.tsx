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
import { useFocusEffect } from '@react-navigation/native';
import { useGeofenceStore } from '../../store/geofenceStore';
import { Geofence, UserInArea } from '../../api/services/geofenceService';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import LeafletMap from '../../components/maps/LeafletMap';

const { width: screenWidth } = Dimensions.get('window');

export const GeofenceManagementScreen = () => {
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

  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [showMap, setShowMap] = useState(false);
  const mapKeyRef = useRef(0);

  // Fetch data on screen focus
  useFocusEffect(
    React.useCallback(() => {
      fetchGeofences();
      fetchAssignedGeofence();
    }, [fetchGeofences, fetchAssignedGeofence])
  );

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
    if (geofence.geofence_type === 'circle') {
      return {
        latitude: geofence.center_latitude,
        longitude: geofence.center_longitude
      };
    } else if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      // Calculate centroid of polygon
      const coords = geofence.polygon_json.coordinates[0];
      const centerLat = coords.reduce((sum, coord) => sum + coord[1], 0) / coords.length;
      const centerLng = coords.reduce((sum, coord) => sum + coord[0], 0) / coords.length;
      return { latitude: centerLat, longitude: centerLng };
    }
    return { latitude: 0, longitude: 0 };
  };

  // Get polygon coordinates for map
  const getPolygonCoordinates = (geofence: Geofence) => {
    if (geofence.geofence_type === 'polygon' && geofence.polygon_json) {
      return geofence.polygon_json.coordinates[0].map(coord => ({
        latitude: coord[1], // GeoJSON uses [lng, lat]
        longitude: coord[0]
      }));
    }
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
      return 13;
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
        <View style={styles.statusCard}>
          <Icon name="location-off" size={24} color={colors.emergencyRed} />
          <Text style={[styles.statusText, { color: colors.emergencyRed }]}>
            No geofence assigned
          </Text>
        </View>
      );
    }

    const statusColor = isInsideGeofence ? colors.successGreen : colors.warningOrange;
    const statusIcon = isInsideGeofence ? 'location-on' : 'location-off';

    return (
      <View style={styles.statusCard}>
        <Icon name={statusIcon} size={24} color={statusColor} />
        <View style={styles.statusContent}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'}
          </Text>
          {lastBoundaryCrossTime > 0 && (
            <Text style={styles.statusTime}>
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
      <View style={styles.geofenceCard}>
        <View style={styles.geofenceHeader}>
          <Icon name="location-on" size={24} color={colors.primary} />
          <View style={styles.geofenceInfo}>
            <Text style={styles.geofenceName}>{geofence.name}</Text>
            <Text style={styles.geofenceType}>
              {geofence.geofence_type === 'circle' ? 'Circular' : 'Polygon'} Geofence
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: geofence.status === 'active' ? colors.successGreen : colors.emergencyRed }
          ]}>
            <Text style={styles.statusBadgeText}>{geofence.status}</Text>
          </View>
        </View>

        <View style={styles.geofenceDetails}>
          <Text style={styles.detailLabel}>Center:</Text>
          <Text style={styles.detailValue}>
            {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
          </Text>

          {geofence.geofence_type === 'circle' && geofence.radius && (
            <>
              <Text style={styles.detailLabel}>Radius:</Text>
              <Text style={styles.detailValue}>{geofence.radius} meters</Text>
            </>
          )}

          <Text style={styles.detailLabel}>Users in area:</Text>
          <Text style={styles.detailValue}>{usersInArea.length}</Text>
        </View>
      </View>
    );
  };

  // Render users in area
  const renderUsersInArea = () => {
    if (usersInArea.length === 0) {
      return (
        <View style={styles.emptyUsers}>
          <Icon name="people" size={48} color={colors.mediumText} />
          <Text style={styles.emptyUsersText}>No users currently in this area</Text>
        </View>
      );
    }

    return usersInArea.map(user => (
      <View key={user.user_id} style={styles.userCard}>
        <View style={[
          styles.userStatus,
          { backgroundColor: user.is_inside ? colors.successGreen : colors.emergencyRed }
        ]} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.user_name}</Text>
          <Text style={styles.userEmail}>{user.user_email}</Text>
          <Text style={styles.userLocation}>
            {user.current_latitude.toFixed(6)}, {user.current_longitude.toFixed(6)}
          </Text>
          <Text style={styles.userLastSeen}>
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
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading geofence data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Geofence Management</Text>
        <Text style={styles.headerSubtitle}>
          Monitor assigned areas and users within boundaries
        </Text>
      </View>

      {/* Geofence Status */}
      {renderGeofenceStatus()}

      {/* Assigned Geofence */}
      {assignedGeofence && (
        <>
          <Text style={styles.sectionTitle}>Assigned Geofence</Text>
          {renderGeofenceDetails(assignedGeofence)}
        </>
      )}

      {/* Map Toggle */}
      {selectedGeofence && (
        <TouchableOpacity
          style={styles.mapToggleButton}
          onPress={handleToggleMap}
          activeOpacity={0.7}
        >
          <Icon name={showMap ? 'map' : 'location-on'} size={24} color={colors.white} />
          <Text style={styles.mapToggleText}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Map View */}
      {showMap && selectedGeofence && (
        <View style={styles.mapContainer}>
          <LeafletMap
            key={`geofence-map-${mapKeyRef.current}`}
            latitude={getGeofenceCenter(selectedGeofence).latitude}
            longitude={getGeofenceCenter(selectedGeofence).longitude}
            zoom={getOptimalZoom(selectedGeofence)}
            height={300}
            polygonCoordinates={getPolygonCoordinates(selectedGeofence)}
            markers={getUserMarkers()}
            showGeofenceCenter={true}
          />
        </View>
      )}

      {/* Users in Area */}
      <Text style={styles.sectionTitle}>Users in Area ({usersInArea.length})</Text>
      <View style={styles.usersContainer}>
        {renderUsersInArea()}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorCard}>
          <Icon name="error" size={20} color={colors.emergencyRed} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.errorDismiss}
            onPress={() => useGeofenceStore.getState().clearError()}
          >
            <Icon name="close" size={16} color={colors.mediumText} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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