import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { zoneTrackingService, ZoneEvent, ZoneStatus } from '../../services/zoneTrackingService';
import { Geofence } from '../../types/alert.types';

// Define interfaces
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface OfficerData {
  id: string;
  name: string;
  currentLocation: LocationData | null;
  assignedZones: Geofence[];
}

interface ZoneMonitoringMapProps {
  officer: OfficerData;
  onZoneEvent?: (event: ZoneEvent) => void;
  style?: any;
}

const { width, height } = Dimensions.get('window');

export const ZoneMonitoringMap: React.FC<ZoneMonitoringMapProps> = ({
  officer,
  onZoneEvent,
  style,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoneStatuses, setZoneStatuses] = useState<ZoneStatus[]>([]);
  const [recentEvents, setRecentEvents] = useState<ZoneEvent[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const webViewRef = useRef<any>(null);

  // Initialize zone tracking
  useEffect(() => {
    console.log('🗺️ Initializing zone monitoring for officer:', officer.name);
    
    // Initialize zone tracking service
    zoneTrackingService.initializeOfficerTracking(
      officer.id,
      officer.name,
      officer.assignedZones
    );

    // Add event listener
    const handleZoneEvent = (event: ZoneEvent) => {
      console.log('📍 Zone event received:', event);
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      
      if (onZoneEvent) {
        onZoneEvent(event);
      }
    };

    zoneTrackingService.addEventListener(officer.id, handleZoneEvent);

    // Get initial status
    const initialStatus = zoneTrackingService.getOfficerZoneStatus(officer.id);
    setZoneStatuses(initialStatus);

    return () => {
      zoneTrackingService.removeEventListener(officer.id, handleZoneEvent);
    };
  }, [officer.id, officer.name, officer.assignedZones, onZoneEvent]);

  // Update officer location and check zones
  useEffect(() => {
    if (officer.currentLocation && isTracking) {
      console.log('📍 Updating officer location for zone monitoring:', {
        officer: officer.name,
        location: officer.currentLocation,
      });

      zoneTrackingService.updateOfficerLocation(officer.id, officer.currentLocation);
      
      // Update zone statuses
      const updatedStatuses = zoneTrackingService.getOfficerZoneStatus(officer.id);
      setZoneStatuses(updatedStatuses);
    }
  }, [officer.currentLocation, officer.id, isTracking]);

  // Start/stop tracking
  const toggleTracking = () => {
    setIsTracking(!isTracking);
    console.log('🗺️ Zone tracking', !isTracking ? 'started' : 'stopped');
  };

  // Generate map HTML with zones
  const generateMapHTML = useCallback(() => {
    if (!officer.currentLocation) return '';

    const officerLat = officer.currentLocation.latitude;
    const officerLng = officer.currentLocation.longitude;

    // Generate zone coordinates
    const zonesHTML = officer.assignedZones.map(zone => {
      const zoneStatus = zoneStatuses.find(status => status.zoneId === zone.id);
      const isInside = zoneStatus?.isInside || false;
      
      if (zone.geofence_type === 'polygon' && zone.polygon_json) {
        try {
          const polygon = JSON.parse(zone.polygon_json);
          const coordinates = polygon.coordinates[0].map((coord: number[]) => 
            `[${coord[1]}, ${coord[0]}]` // Convert to [lat, lng] for map
          ).join(',');
          
          return `
            var polygon${zone.id} = L.polygon([${coordinates}], {
              color: '${isInside ? '#10b981' : '#ef4444'}',
              fillColor: '${isInside ? '#10b981' : '#ef4444'}',
              fillOpacity: ${isInside ? '0.5' : '0.2'},
              weight: 3,
              opacity: 0.8
            }).addTo(map);
            
            polygon${zone.id}.bindPopup('<div style="font-family: Arial, sans-serif;"><strong>${zone.name}</strong><br/>Type: ${zone.geofence_type}<br/>Status: ${isInside ? '🟢 Inside' : '🔴 Outside'}<br/>Officer: ${officer.name}</div>');
            
            // Add zone label
            var center${zone.id} = polygon${zone.id}.getBounds().getCenter();
            L.marker([center${zone.id}.lat, center${zone.id}.lng], {
              icon: L.divIcon({
                html: '<div style="background: ${isInside ? '#10b981' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">${zone.name}</div>',
                className: 'zone-label',
                iconSize: [100, 20],
                iconAnchor: [50, 10]
              })
            }).addTo(map);
          `;
        } catch (error) {
          console.error('❌ Error parsing polygon for zone:', zone.id);
          return '';
        }
      } else if (zone.geofence_type === 'circle') {
        return `
          var circle${zone.id} = L.circle([${zone.center_latitude}, ${zone.center_longitude}], {
            color: '${isInside ? '#10b981' : '#ef4444'}',
            fillColor: '${isInside ? '#10b981' : '#ef4444'}',
            fillOpacity: ${isInside ? '0.5' : '0.2'},
            radius: ${zone.radius || 1000},
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          
          circle${zone.id}.bindPopup('<div style="font-family: Arial, sans-serif;"><strong>${zone.name}</strong><br/>Type: ${zone.geofence_type}<br/>Radius: ${zone.radius || 1000}m<br/>Status: ${isInside ? '🟢 Inside' : '🔴 Outside'}<br/>Officer: ${officer.name}</div>');
          
          // Add zone label
          L.marker([${zone.center_latitude}, ${zone.center_longitude}], {
            icon: L.divIcon({
              html: '<div style="background: ${isInside ? '#10b981' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">${zone.name}</div>',
              className: 'zone-label',
              iconSize: [100, 20],
              iconAnchor: [50, 10]
            })
          }).addTo(map);
        `;
      }
      return '';
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; }
          .custom-popup { font-family: Arial, sans-serif; }
          .zone-label { 
            background: rgba(0,0,0,0.7) !important; 
            border: none !important;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          var map = L.map('map').setView([${officerLat}, ${officerLng}], 15);
          
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Officer marker
          var officerIcon = L.divIcon({
            html: '<div style="background: #2563eb; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">👮</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'officer-marker'
          });

          var officerMarker = L.marker([${officerLat}, ${officerLng}], { icon: officerIcon }).addTo(map);
          officerMarker.bindPopup('<div style="font-family: Arial, sans-serif;"><div style="color: #2563eb; font-weight: bold;">👮 OFFICER</div><div><strong>Name:</strong> ${officer.name}</div><div><strong>ID:</strong> ${officer.id}</div><div><strong>Status:</strong> ${isTracking ? '🟢 Tracking' : '🔴 Offline'}</div><div><strong>Location:</strong> ${officerLat.toFixed(6)}, ${officerLng.toFixed(6)}</div></div>');

          // Add zones
          ${zonesHTML}

          // Fit map to show all zones and officer
          var group = new L.featureGroup([officerMarker]);
          ${officer.assignedZones.map(zone => {
            if (zone.geofence_type === 'polygon' && zone.polygon_json) {
              return `if (typeof polygon${zone.id} !== 'undefined') group.addLayer(polygon${zone.id});`;
            } else if (zone.geofence_type === 'circle') {
              return `if (typeof circle${zone.id} !== 'undefined') group.addLayer(circle${zone.id});`;
            }
            return '';
          }).join('\n')}
          
          if (group.getLayers().length > 1) {
            map.fitBounds(group.getBounds().pad(0.2));
          }

          // Add legend
          var legend = L.control({position: 'bottomright'});
          legend.onAdd = function(map) {
            var div = L.DomUtil.create('div', 'info legend');
            div.style.backgroundColor = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            div.style.border = '2px solid #ccc';
            div.style.fontSize = '12px';
            div.innerHTML = 
              '<div style="margin-bottom: 5px;"><strong>ZONE STATUS</strong></div>' +
              '<div style="display: flex; align-items: center; margin-bottom: 3px;">' +
                '<span style="background: #10b981; width: 20px; height: 10px; display: inline-block; margin-right: 8px; border-radius: 2px;"></span>' +
                '<span>Inside Zone</span>' +
              '</div>' +
              '<div style="display: flex; align-items: center; margin-bottom: 3px;">' +
                '<span style="background: #ef4444; width: 20px; height: 10px; display: inline-block; margin-right: 8px; border-radius: 2px;"></span>' +
                '<span>Outside Zone</span>' +
              '</div>' +
              '<div style="display: flex; align-items: center;">' +
                '<span style="background: #2563eb; color: white; border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 8px;">👮</span>' +
                '<span>Officer Location</span>' +
              '</div>';
            return div;
          };
          legend.addTo(map);

          // Map is ready
          window.mapReady = true;
        </script>
      </body>
      </html>
    `;
  }, [officer, zoneStatuses, isTracking]);

  const renderZoneStatusList = () => {
    return (
      <View style={styles.zoneStatusContainer}>
        <Text style={styles.zoneStatusTitle}>Assigned Zones</Text>
        {zoneStatuses.map((status) => (
          <View key={status.zoneId} style={[
            styles.zoneStatusItem,
            { borderColor: status.isInside ? colors.successGreen : colors.emergencyRed }
          ]}>
            <View style={[
              styles.zoneIndicator,
              { backgroundColor: status.isInside ? colors.successGreen : colors.emergencyRed }
            ]}>
              <Icon 
                name={status.isInside ? 'check-circle' : 'cancel'} 
                size={16} 
                color={colors.white} 
              />
            </View>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{status.zoneName}</Text>
              <Text style={[
                styles.zoneStatusText,
                { color: status.isInside ? colors.successGreen : colors.emergencyRed }
              ]}>
                {status.isInside ? '🟢 Inside Zone' : '🔴 Outside Zone'}
              </Text>
              {status.isInside && status.entryTime && (
                <Text style={styles.zoneTimeText}>
                  Entered: {new Date(status.entryTime).toLocaleTimeString()}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderRecentEvents = () => {
    if (recentEvents.length === 0) return null;

    return (
      <View style={styles.eventsContainer}>
        <Text style={styles.eventsTitle}>Recent Zone Activity</Text>
        {recentEvents.map((event, index) => (
          <View key={event.id} style={styles.eventItem}>
            <View style={[
              styles.eventIndicator,
              { backgroundColor: event.eventType === 'entry' ? colors.successGreen : colors.emergencyRed }
            ]}>
              <Icon 
                name={event.eventType === 'entry' ? 'login' : 'logout'} 
                size={16} 
                color={colors.white} 
              />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventZone}>{event.zoneName}</Text>
              <Text style={styles.eventAction}>
                {event.eventType === 'entry' ? '🟢 Entered' : '🔴 Exited'}
              </Text>
              <Text style={styles.eventTime}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </Text>
              {event.duration && (
                <Text style={styles.eventDuration}>
                  Duration: {Math.round(event.duration)}s
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Zone Monitoring</Text>
        <TouchableOpacity
          style={[
            styles.trackingButton,
            { backgroundColor: isTracking ? colors.successGreen : colors.mediumText }
          ]}
          onPress={toggleTracking}
        >
          <Icon 
            name={isTracking ? 'gps-fixed' : 'gps-off'} 
            size={20} 
            color={colors.white} 
          />
          <Text style={styles.trackingButtonText}>
            {isTracking ? 'Tracking' : 'Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map placeholder - would be WebView in production */}
      <View style={styles.mapContainer}>
        <Text style={styles.mapPlaceholderText}>Zone Map</Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Officer: {officer.name}
        </Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Zones: {officer.assignedZones.length} assigned
        </Text>
        <Text style={styles.mapPlaceholderSubtext}>
          Status: {zoneStatuses.filter(z => z.isInside).length} inside, {zoneStatuses.filter(z => !z.isInside).length} outside
        </Text>
      </View>

      <ScrollView style={styles.infoContainer} showsVerticalScrollIndicator={false}>
        {renderZoneStatusList()}
        {renderRecentEvents()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  trackingButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    margin: 16,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: colors.mediumText,
    marginBottom: 4,
  },
  infoContainer: {
    flex: 1,
    padding: 16,
  },
  zoneStatusContainer: {
    marginBottom: 20,
  },
  zoneStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 12,
  },
  zoneStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
  },
  zoneIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 4,
  },
  zoneStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  zoneTimeText: {
    fontSize: 12,
    color: colors.mediumText,
  },
  eventsContainer: {
    marginBottom: 20,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventZone: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 2,
  },
  eventAction: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: colors.mediumText,
    marginBottom: 2,
  },
  eventDuration: {
    fontSize: 12,
    color: colors.infoBlue,
  },
});
