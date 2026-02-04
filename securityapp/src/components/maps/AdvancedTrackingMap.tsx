import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';

// Define interfaces
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

interface AlertData {
  id: string;
  location: LocationData;
  officerId: string;
  officerName: string;
  status: 'active' | 'resolved' | 'cancelled';
  createdAt: string;
  alertType: 'emergency' | 'security' | 'general';
}

interface OfficerData {
  id: string;
  name: string;
  currentLocation: LocationData | null;
  isTracking: boolean;
  lastUpdate: number;
}

interface AdvancedTrackingMapProps {
  alert: AlertData;
  officer: OfficerData;
  onTrackingUpdate?: (location: LocationData) => void;
  onAlertResolved?: () => void;
  style?: any;
}

const { width, height } = Dimensions.get('window');

export const AdvancedTrackingMap: React.FC<AdvancedTrackingMapProps> = ({
  alert,
  officer,
  onTrackingUpdate,
  onAlertResolved,
  style,
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationData | null>(null);
  const webViewRef = useRef<any>(null);
  const trackingRef = useRef<boolean>(false);

  // Initialize map with alert location as center
  useEffect(() => {
    if (alert.location && !mapCenter) {
      setMapCenter(alert.location);
    }
  }, [alert.location, mapCenter]);

  // Start live tracking when component mounts
  useEffect(() => {
    if (alert.status === 'active' && officer.isTracking && !trackingRef.current) {
      startLiveTracking();
    }

    return () => {
      stopLiveTracking();
    };
  }, [alert.status, officer.isTracking]);

  // Stop tracking when alert is resolved
  useEffect(() => {
    if (alert.status !== 'active') {
      stopLiveTracking();
      if (onAlertResolved) {
        onAlertResolved();
      }
    }
  }, [alert.status]);

  const startLiveTracking = () => {
    if (trackingRef.current) return;
    
    trackingRef.current = true;
    console.log('🚀 Starting advanced live tracking for officer:', officer.name);

    // Update officer location every 5 seconds
    const interval = setInterval(() => {
      updateOfficerLocation();
    }, 5000);

    setTrackingInterval(interval);
  };

  const stopLiveTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
    trackingRef.current = false;
    console.log('⏹️ Stopped live tracking for officer:', officer.name);
  };

  const updateOfficerLocation = async () => {
    try {
      // Import geolocation dynamically
      const GeolocationModule = await import('@react-native-community/geolocation');
      const Geolocation = GeolocationModule.default;

      if (!Geolocation || !Geolocation.getCurrentPosition) {
        console.warn('⚠️ Geolocation not available');
        return;
      }

      const position = await new Promise<any>((resolve, reject) => {
        Geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.warn('⚠️ GPS error for officer tracking:', error.message);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000, // 30 seconds for officer tracking
            maximumAge: 10000, // 10 second cache acceptable
          }
        );
      });

      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };

      console.log('📍 Officer location updated:', {
        officer: officer.name,
        location: newLocation,
        accuracy: position.coords.accuracy,
      });

      // Update officer data and notify parent
      if (onTrackingUpdate) {
        onTrackingUpdate(newLocation);
      }

    } catch (error) {
      console.warn('⚠️ Failed to update officer location:', error);
    }
  };

  const generateMapHTML = useCallback(() => {
    if (!alert.location) return '';

    const alertLat = alert.location.latitude;
    const alertLng = alert.location.longitude;
    const officerLat = officer.currentLocation?.latitude;
    const officerLng = officer.currentLocation?.longitude;

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
          .alert-popup { color: #dc2626; font-weight: bold; }
          .officer-popup { color: #2563eb; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map
          var map = L.map('map').setView([${alertLat}, ${alertLng}], 16);
          
          // Add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          }).addTo(map);

          // Alert marker (RED - FIXED LOCATION)
          var alertIcon = L.divIcon({
            html: '<div style="background: #dc2626; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">🚨</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'alert-marker'
          });

          var alertMarker = L.marker([${alertLat}, ${alertLng}], { icon: alertIcon }).addTo(map);
          alertMarker.bindPopup(\`
            <div class="custom-popup">
              <div class="alert-popup">🚨 ALERT LOCATION</div>
              <div><strong>Type:</strong> ${alert.alertType.toUpperCase()}</div>
              <div><strong>Status:</strong> ${alert.status.toUpperCase()}</div>
              <div><strong>Created:</strong> ${new Date(alert.createdAt).toLocaleString()}</div>
              <div><strong>Coordinates:</strong> ${alertLat.toFixed(6)}, ${alertLng.toFixed(6)}</div>
              <div style="color: #666; font-size: 12px; margin-top: 5px;">
                <em>This marker represents the incident location and does not move</em>
              </div>
            </div>
          \`);

          // Officer marker (BLUE - LIVE TRACKING)
          var officerIcon = L.divIcon({
            html: '<div style="background: #2563eb; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">👮</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'officer-marker'
          });

          var officerMarker = null;
          
          // Function to update officer position
          window.updateOfficerPosition = function(lat, lng, accuracy, timestamp) {
            if (officerMarker) {
              officerMarker.setLatLng([lat, lng]);
            } else {
              officerMarker = L.marker([lat, lng], { icon: officerIcon }).addTo(map);
              officerMarker.bindPopup(\`
                <div class="custom-popup">
                  <div class="officer-popup">👮 OFFICER LOCATION</div>
                  <div><strong>Name:</strong> ${officer.name}</div>
                  <div><strong>ID:</strong> ${officer.id}</div>
                  <div><strong>Status:</strong> ${officer.isTracking ? 'TRACKING' : 'OFFLINE'}</div>
                  <div><strong>Coordinates:</strong> ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>
                  <div><strong>Accuracy:</strong> ' + (accuracy ? accuracy.toFixed(0) + 'm' : 'Unknown') + '</div>
                  <div><strong>Last Update:</strong> ' + new Date(timestamp).toLocaleString() + '</div>
                  <div style="color: #666; font-size: 12px; margin-top: 5px;">
                    <em>This marker updates in real-time as the officer moves</em>
                  </div>
                </div>
              \`);
            }
            
            // Update popup content
            officerMarker.setPopupContent(\`
              <div class="custom-popup">
                <div class="officer-popup">👮 OFFICER LOCATION</div>
                <div><strong>Name:</strong> ${officer.name}</div>
                <div><strong>ID:</strong> ${officer.id}</div>
                <div><strong>Status:</strong> ${officer.isTracking ? 'TRACKING' : 'OFFLINE'}</div>
                <div><strong>Coordinates:</strong> ' + lat.toFixed(6) + ', ' + lng.toFixed(6) + '</div>
                <div><strong>Accuracy:</strong> ' + (accuracy ? accuracy.toFixed(0) + 'm' : 'Unknown') + '</div>
                <div><strong>Last Update:</strong> ' + new Date(timestamp).toLocaleString() + '</div>
                <div style="color: #666; font-size: 12px; margin-top: 5px;">
                  <em>This marker updates in real-time as the officer moves</em>
                </div>
              </div>
            \`);
          };

          // Initial officer position if available
          ${officerLat && officerLng ? `
            window.updateOfficerPosition(${officerLat}, ${officerLng}, ${officer.currentLocation?.accuracy || 0}, ${officer.currentLocation?.timestamp || Date.now()});
          ` : ''}

          // Fit bounds to show both markers
          var group = new L.featureGroup([alertMarker]);
          ${officerLat && officerLng ? 'group.addLayer(officerMarker);' : ''}
          map.fitBounds(group.getBounds().pad(0.1));

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
              '<div style="margin-bottom: 5px;"><strong>LEGEND</strong></div>' +
              '<div style="display: flex; align-items: center; margin-bottom: 3px;">' +
                '<span style="background: #dc2626; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 10px;">🚨</span>' +
                '<span>Alert Location (Fixed)</span>' +
              '</div>' +
              '<div style="display: flex; align-items: center;">' +
                '<span style="background: #2563eb; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 10px;">👮</span>' +
                '<span>Officer Location (Live)</span>' +
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
  }, [alert, officer]);

  // Update officer marker when location changes
  useEffect(() => {
    if (officer.currentLocation && webViewRef.current) {
      const { latitude, longitude, accuracy, timestamp } = officer.currentLocation;
      
      // Inject JavaScript to update officer marker
      const updateScript = `
        if (window.updateOfficerPosition && window.mapReady) {
          window.updateOfficerPosition(${latitude}, ${longitude}, ${accuracy || 0}, ${timestamp || Date.now()});
        }
      `;
      
      webViewRef.current?.injectJavaScript(updateScript);
    }
  }, [officer.currentLocation]);

  if (!alert.location) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Icon name="error" size={48} color={colors.emergencyRed} />
          <Text style={styles.errorText}>No alert location available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {!mapLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tracking map...</Text>
        </View>
      )}
      
      {/* WebView would go here - using placeholder for now */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Advanced Tracking Map</Text>
        <Text style={styles.placeholderSubtext}>
          Alert: 🚨 {alert.alertType} at ({alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)})
        </Text>
        <Text style={styles.placeholderSubtext}>
          Officer: 👮 {officer.name} - {officer.isTracking ? 'Tracking' : 'Offline'}
        </Text>
        {officer.currentLocation && (
          <Text style={styles.placeholderSubtext}>
            Officer GPS: ({officer.currentLocation.latitude.toFixed(4)}, {officer.currentLocation.longitude.toFixed(4)})
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayBg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.mediumText,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.emergencyRed,
    textAlign: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    margin: 10,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.darkText,
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.mediumText,
    marginBottom: 5,
    textAlign: 'center',
  },
});
