import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../../utils/colors';

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  height?: number | string;
  showMarker?: boolean;
  markerTitle?: string;
  polygonCoordinates?: Array<{
    latitude: number;
    longitude: number;
  }>;
  mapKey?: string; // For controlled re-mounting
}

interface LeafletMapWithRefProps extends LeafletMapProps {
  forwardedRef?: React.Ref<WebView>;
}

export const LeafletMap: React.FC<LeafletMapWithRefProps> = ({
  latitude,
  longitude,
  zoom = 15,
  height = 300,
  showMarker = true,
  markerTitle = 'Location',
  polygonCoordinates,
  mapKey,
  forwardedRef
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Forward the ref to the parent
  useImperativeHandle(forwardedRef, () => webViewRef.current!, []);
  // Create inline HTML with Leaflet
  const generateMapHTML = () => {
    console.log('Generating map HTML for coordinates:', latitude, longitude);

    // Process polygon coordinates outside template literal to avoid syntax issues
    const polygonCoordsString = polygonCoordinates && polygonCoordinates.length >= 3
      ? polygonCoordinates.map(coord => `[${coord.latitude}, ${coord.longitude}]`).join(',\n                            ')
      : '';

    // Return HTML with embedded Leaflet to avoid external resource issues
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Leaflet Map</title>
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
        console.log('Map HTML loaded, coordinates:', ${latitude}, ${longitude});

        // Send loaded message to React Native
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'loaded'
        }));

        try {
            // Simple map implementation without external dependencies
            var map = null;

            function initMap() {
                // Create a simple map container
                var mapDiv = document.getElementById('map');
                if (!mapDiv) return;

                // Set up basic map styling
                mapDiv.style.backgroundColor = '#e0f2fe';
                mapDiv.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #0369a1; font-size: 18px; font-weight: bold;">🗺️ Map Loading...<br><small>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}</small></div>';

                // Try to load Leaflet from CDN
                loadLeaflet();
            }

            function loadLeaflet() {
                // Load CSS first
                var cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                cssLink.onload = function() {
                    console.log('Leaflet CSS loaded');

                    // Load JS
                    var script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.onload = function() {
                        console.log('Leaflet JS loaded, initializing map...');
                        initializeLeafletMap();
                    };
                    script.onerror = function() {
                        console.error('Failed to load Leaflet JS');
                        showFallbackMap();
                    };
                    document.head.appendChild(script);
                };
                cssLink.onerror = function() {
                    console.error('Failed to load Leaflet CSS');
                    showFallbackMap();
                };
                document.head.appendChild(cssLink);
            }

            function initializeLeafletMap() {
                try {
                    // Clear loading message
                    var mapDiv = document.getElementById('map');
                    mapDiv.innerHTML = '';

                    // Initialize Leaflet map
                    map = L.map('map').setView([${latitude}, ${longitude}], ${zoom});

                    // Add tile layer
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors',
                        maxZoom: 19,
                    }).addTo(map);

                    // Add marker
                    ${showMarker ? `L.marker([${latitude}, ${longitude}]).addTo(map).bindPopup('${markerTitle}').openPopup();` : ''}

                    // Add polygon if coordinates provided
                    ${polygonCoordsString ? `
                    try {
                        var polygonCoords = [
                            ${polygonCoordsString}
                        ];
                        console.log('Adding polygon with coordinates:', polygonCoords);
                        var polygon = L.polygon(polygonCoords, {
                            color: '#DC2626',
                            weight: 3,
                            opacity: 0.8,
                            fillColor: '#FEE2E2',
                            fillOpacity: 0.3
                        }).addTo(map);
                    } catch (polyError) {
                        console.error('Error adding polygon:', polyError);
                    }
                    ` : ''}

                    console.log('Map initialized successfully');
                    window.mapInstance = map;

                    // Send success message to React Native
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'mapLoaded'
                    }));

                } catch (error) {
                    console.error('Error initializing Leaflet map:', error);
                    showFallbackMap();
                }
            }

            function showFallbackMap() {
                var mapDiv = document.getElementById('map');
                mapDiv.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #ef4444; font-size: 16px; font-weight: bold;">⚠️ Map Unavailable<br><small>Check internet connection</small><br><small>Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}</small></div>';
                mapDiv.style.backgroundColor = '#fef2f2';

                // Send error message to React Native
                window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'error',
                    message: 'Failed to load map resources'
                }));
            }

            // Handle incoming messages from React Native
            window.addEventListener('message', function(event) {
                try {
                    var data = JSON.parse(event.data);
                    console.log('Received message from React Native:', data);

                    if (data.type === 'updateOfficerMarker' && map) {
                        if (window.officerMarker) {
                            window.officerMarker.setLatLng([data.latitude, data.longitude]);
                        } else {
                            // Create officer marker if it doesn't exist
                            var officerIcon = L.divIcon({
                                html: '<div style="background-color: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); position: relative;"><div style="position: absolute; top: -8px; left: -8px; width: 36px; height: 36px; border: 2px solid #007AFF; border-radius: 50%; opacity: 0.3; animation: pulse 2s infinite;"></div></div><style>@keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.2); opacity: 0.1; } 100% { transform: scale(1); opacity: 0.3; } }</style>',
                                className: 'officer-location-marker',
                                iconSize: [36, 36],
                                iconAnchor: [18, 18]
                            });
                            window.officerMarker = L.marker([data.latitude, data.longitude], { icon: officerIcon }).addTo(map);
                            window.officerMarker.bindPopup('<b>🚔 Live Officer Location</b><br/>📍 Real-time GPS tracking<br/>⚡ Updates every 1 second<br/>🎯 High accuracy mode');
                        }
                    }
                } catch (error) {
                    console.error('Error handling message:', error);
                }
            });

            // Initialize map when page loads
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initMap);
            } else {
                initMap();
            }

        } catch (error) {
            console.error('Critical error in map initialization:', error);
            showFallbackMap();
        }

        // Add error handling for map loading
        window.addEventListener('error', function(e) {
            console.error('Map error:', e.error);
            // Send error message to React Native
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: e.error ? e.error.toString() : 'Unknown map error'
            }));
        });

        window.addEventListener('load', function() {
            console.log('Map HTML loaded successfully');
            // Send success message to React Native
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'loaded'
            }));
        });
    </script>
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

        // Store map reference globally for dynamic marker updates
        window.mapInstance = map;

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

        // Add polygon if coordinates provided
        ${polygonCoordinates && polygonCoordinates.length >= 3 ? `
        try {
            const polygonCoords = [
                ${polygonCoordinates.map(coord => `[${coord.latitude}, ${coord.longitude}]`).join(',\n                ')}
            ];
            console.log('Drawing polygon with coordinates:', polygonCoords);

            // Validate coordinates
            if (polygonCoords.length >= 3) {
                const polygon = L.polygon(polygonCoords, {
                    color: '#DC2626',
                    weight: 3,
                    opacity: 0.8,
                    fillColor: '#FEE2E2',
                    fillOpacity: 0.3
                }).addTo(map);

                // Fit map to polygon bounds
                const bounds = polygon.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [20, 20] });
                }
            } else {
                console.warn('Not enough coordinates for polygon:', polygonCoords.length);
            }
        } catch (error) {
            console.error('Error creating polygon:', error);
        }

            polygon.bindPopup('Security Geofence Area');

            console.log('Polygon drawn successfully');
        } catch (error) {
            console.error('Error drawing polygon:', error);
        }
        ` : ''}

        // Officer location marker will be added dynamically via postMessage
        // This prevents initial re-renders and allows smooth updates

        ${showMarker ? `
        // Fit to marker bounds
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

        // Handle incoming messages from React Native
        window.addEventListener('message', function(event) {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'updateOfficerMarker') {
                    // Update officer marker position
                    const newLatLng = L.latLng(data.latitude, data.longitude);

                    if (window.officerMarker) {
                        // Update existing marker position
                        window.officerMarker.setLatLng(newLatLng);
                    } else {
                        // Create new officer marker if it doesn't exist
                        const officerIcon = L.divIcon({
                            html: '<div style="background-color: #007AFF; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4); position: relative;"><div style="position: absolute; top: -8px; left: -8px; width: 36px; height: 36px; border: 2px solid #007AFF; border-radius: 50%; opacity: 0.3; animation: pulse 2s infinite;"></div></div><style>@keyframes pulse { 0% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.2); opacity: 0.1; } 100% { transform: scale(1); opacity: 0.3; } }</style>',
                            className: 'officer-location-marker',
                            iconSize: [36, 36],
                            iconAnchor: [18, 18]
                        });

                        window.officerMarker = L.marker(newLatLng, { icon: officerIcon }).addTo(window.mapInstance);
                        window.officerMarker.bindPopup('<b>🚔 Live Officer Location</b><br/>📍 Real-time GPS tracking<br/>⚡ Updates every 1 second<br/>🎯 High accuracy mode');
                    }
                }
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        // Officer marker will be added via postMessage updates
        // window.officerMarker will be set when location updates arrive
    </script>
</body>
</html>`;
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('LeafletMap message:', data);
      if (data.type === 'mapLoaded') {
        setIsLoading(false);
        console.log('✅ Map loaded successfully');
      } else if (data.type === 'loaded') {
        console.log('✅ HTML document loaded');
      } else if (data.type === 'error') {
        console.error('❌ Map error:', data.message);
      } else if (data.type === 'updateOfficerMarker') {
        console.log('📍 Officer marker update processed');
      }
    } catch (error) {
      console.log('LeafletMap raw message:', event.nativeEvent.data);
    }
  };


  const handleLoadEnd = () => {
    console.log('WebView load ended');
    // Fallback: hide loading after a timeout in case map load message isn't received
    setTimeout(() => {
      setIsLoading(false);
      console.log('Loading timeout reached, hiding loading indicator');
    }, 3000);
  };

  const handleError = (error: any) => {
    console.error('WebView error:', error);
    setHasError(true);
    setIsLoading(false);
  };

  // Officer location updates are now handled by the parent component via postMessage

  return (
    <View style={[styles.container, { height }]}>
      {isLoading && !hasError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.placeholderText}>Map Loading...</Text>
          <Text style={styles.placeholderSubtext}>
            Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
        </View>
      )}
      {hasError && (
        <View style={styles.loadingContainer}>
          <Text style={styles.placeholderText}>Map Failed to Load</Text>
          <Text style={styles.placeholderSubtext}>
            Check internet connection and try again
          </Text>
        </View>
      )}
      {!hasError && (
        <WebView
          ref={webViewRef}
          source={{ html: generateMapHTML() }}
          style={[styles.webview, { height }]}
          onMessage={handleMessage}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleError}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={false}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          useWebkit={true}
          sharedCookiesEnabled={true}
          thirdPartyCookiesEnabled={true}
        />
      )}
    </View>
  );
});

LeafletMap.displayName = 'LeafletMap';

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