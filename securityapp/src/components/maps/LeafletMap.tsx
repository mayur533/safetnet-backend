import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
// import { WebView } from 'react-native-webview';
import { colors } from '../../utils/colors';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number;
  showMarker?: boolean;
  markerTitle?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  latitude,
  longitude,
  zoom = 15,
  height = 300,
  showMarker = true,
  markerTitle = 'Location'
}) => {
  // Create inline HTML with Leaflet
  const generateMapHTML = () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leaflet Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            font-family: Arial, sans-serif;
        }
        #map {
            height: 100%;
            width: 100%;
        }
        .leaflet-control-attribution {
            background-color: rgba(255, 255, 255, 0.8);
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map
        const map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        // Add marker if requested
        ${showMarker ? `
        const marker = L.marker([${latitude}, ${longitude}]).addTo(map);
        marker.bindPopup('${markerTitle}').openPopup();
        ` : ''}

        // Fit map to marker bounds if marker is shown
        ${showMarker ? `
        map.fitBounds([[${latitude}, ${longitude}], [${latitude}, ${longitude}]], {
            padding: [20, 20]
        });
        ` : ''}

        // Handle map load event
        map.whenReady(function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapLoaded',
                center: map.getCenter(),
                zoom: map.getZoom()
            }));
        });

        // Handle marker click
        ${showMarker ? `
        marker.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerClicked',
                lat: ${latitude},
                lng: ${longitude}
            }));
        });
        ` : ''}
    </script>
</body>
</html>`;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('LeafletMap message:', data);
    } catch (error) {
      console.log('LeafletMap raw message:', event.nativeEvent.data);
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.placeholderText}>Map Loading...</Text>
        <Text style={styles.placeholderSubtext}>
          Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.lightGrayBg,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGrayBg,
  },
  placeholderText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.darkText,
  },
  placeholderSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: colors.mediumText,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});