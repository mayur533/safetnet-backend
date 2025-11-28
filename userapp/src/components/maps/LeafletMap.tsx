import React, {useRef, useEffect, useState, forwardRef, useImperativeHandle} from 'react';
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native';
import {WebView} from 'react-native-webview';

interface Marker {
  id: string;
  lat: number;
  lng: number;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface Circle {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  color?: string;
  fillColor?: string;
  opacity?: number;
}

interface Polygon {
  id: string;
  polygon: Array<[number, number]>; // Array of [lat, lng] pairs
  color?: string;
  fillColor?: string;
  opacity?: number;
  title?: string;
}

interface LeafletMapProps {
  initialCenter?: {lat: number; lng: number};
  initialZoom?: number;
  markers?: Marker[];
  circles?: Circle[];
  polygons?: Polygon[];
  onMarkerPress?: (marker: Marker) => void;
  onMapPress?: (lat: number, lng: number) => void;
  showUserLocation?: boolean;
  userLocation?: {lat: number; lng: number};
}

export interface LeafletMapRef {
  fitBounds: (bounds: [[number, number], [number, number]]) => void;
}

const LeafletMap = forwardRef<LeafletMapRef, LeafletMapProps>(({
  initialCenter = {lat: 20.5937, lng: 78.9629},
  initialZoom = 10,
  markers = [],
  circles = [],
  polygons = [],
  onMarkerPress,
  onMapPress,
  showUserLocation = false,
  userLocation,
}, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useImperativeHandle(ref, () => ({
    fitBounds: (bounds: [[number, number], [number, number]]) => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            if (window.fitBounds && typeof window.fitBounds === 'function') {
              window.fitBounds(${JSON.stringify(bounds)});
            } else if (window.map) {
              const boundsObj = L.latLngBounds(${JSON.stringify(bounds)});
              window.map.fitBounds(boundsObj, { padding: [50, 50], maxZoom: 15 });
            }
          })();
          true;
        `);
      }
    },
  }));

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .custom-marker {
          background: #2563EB;
          border: 3px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .user-marker {
          background: #10B981;
          border: 3px solid white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map;
        let markers = [];
        let circles = [];
        let polygons = [];
        
        function initMap() {
          // Initialize map immediately
          map = L.map('map', {
            zoomControl: false,
            preferCanvas: true // Better performance
          }).setView([${initialCenter.lat}, ${initialCenter.lng}], ${initialZoom});
          
          // Add tile layer with error handling
          const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            tileSize: 256,
            zoomOffset: 0
          });
          tileLayer.addTo(map);
          
          // Add initial markers immediately
          if (${JSON.stringify(markers)}.length > 0) {
            updateMarkers(${JSON.stringify(markers)});
          }
          if (${JSON.stringify(circles)}.length > 0) {
            updateCircles(${JSON.stringify(circles)});
          }
          if (${JSON.stringify(polygons)}.length > 0) {
            updatePolygons(${JSON.stringify(polygons)});
          }
          
          // Fit bounds to show all markers if we have them
          if (${JSON.stringify(markers)}.length > 0) {
            const bounds = L.latLngBounds(${JSON.stringify(markers)}.map(m => [m.lat, m.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
          
          // Map click handler
          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapPress',
              lat: e.latlng.lat,
              lng: e.latlng.lng
            }));
          });
          
          // Signal that map is ready
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapReady'
          }));
        }
        
        function updateMarkers(newMarkers) {
          if (!map || !newMarkers || newMarkers.length === 0) return;
          
          // Clear existing markers
          markers.forEach(marker => map.removeLayer(marker));
          markers = [];
          
          // Add new markers
          newMarkers.forEach(markerData => {
            if (!markerData.lat || !markerData.lng) return; // Skip invalid markers
            
            const isLive = markerData.isLive || false;
            const iconHtml = markerData.icon === 'user' ? '👤' : (markerData.icon === 'shield' ? '🛡️' : '📍');
            const icon = L.divIcon({
              className: markerData.icon === 'user' ? 'user-marker' : 'custom-marker',
              html: iconHtml + (isLive ? '<span style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:#10B981;border:2px solid white;border-radius:50%;"></span>' : ''),
              iconSize: [markerData.icon === 'user' ? 24 : 20, markerData.icon === 'user' ? 24 : 20]
            });
            
            const marker = L.marker([markerData.lat, markerData.lng], {icon})
              .addTo(map);
            
            if (markerData.title || markerData.description) {
              const statusText = isLive ? '<span style="color:#10B981;font-weight:bold;">● Live</span>' : '';
              marker.bindPopup(\`
                <div>
                  <strong>\${markerData.title || ''}</strong><br/>
                  \${markerData.description || ''}<br/>
                  \${statusText}
                </div>
              \`);
            }
            
            marker.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'markerPress',
                marker: markerData
              }));
            });
            
            markers.push(marker);
          });
          
          // Auto-fit bounds if we have multiple markers
          if (markers.length > 1) {
            const bounds = L.latLngBounds(markers.map(m => m.getLatLng()));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          } else if (markers.length === 1) {
            // Center on single marker
            map.setView(markers[0].getLatLng(), 15);
          }
        }
        
        // Make updateMarkers available globally
        window.updateMarkers = updateMarkers;
        
        function updateCircles(newCircles) {
          // Clear existing circles
          circles.forEach(circle => map.removeLayer(circle));
          circles = [];
          
          // Add new circles
          newCircles.forEach(circleData => {
            const circle = L.circle([circleData.lat, circleData.lng], {
              radius: circleData.radius,
              color: circleData.color || '#2563EB',
              fillColor: circleData.fillColor || '#2563EB33',
              fillOpacity: circleData.opacity || 0.2,
              weight: 2
            }).addTo(map);
            
            circles.push(circle);
          });
        }
        
        // Make updateCircles available globally
        window.updateCircles = updateCircles;
        
        function updatePolygons(newPolygons) {
          // Clear existing polygons
          polygons.forEach(polygon => map.removeLayer(polygon));
          polygons = [];
          
          // Add new polygons
          newPolygons.forEach(polygonData => {
            if (!polygonData.polygon || polygonData.polygon.length < 3) return; // Need at least 3 points
            
            const polygon = L.polygon(polygonData.polygon, {
              color: polygonData.color || '#2563EB',
              fillColor: polygonData.fillColor || polygonData.color || '#2563EB',
              fillOpacity: polygonData.opacity !== undefined ? polygonData.opacity : 0.3,
              weight: polygonData.opacity && polygonData.opacity > 0.4 ? 3 : 2, // Thicker border when selected
              opacity: 0.8
            }).addTo(map);
            
            if (polygonData.title) {
              polygon.bindPopup(\`<strong>\${polygonData.title}</strong>\`);
            }
            
            polygon.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'polygonPress',
                polygon: polygonData
              }));
            });
            
            polygons.push(polygon);
          });
          
          // Fit bounds to show all polygons if we have them
          if (polygons.length > 0) {
            const bounds = L.latLngBounds([]);
            polygons.forEach(poly => {
              bounds.extend(poly.getBounds());
            });
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
        }
        
        // Make updatePolygons available globally
        window.updatePolygons = updatePolygons;
        
        function setView(lat, lng, zoom) {
          if (map) {
            map.setView([lat, lng], zoom || 15);
          }
        }
        
        function fitBounds(bounds) {
          if (bounds && bounds.length >= 2 && map) {
            // bounds should be [[minLat, minLng], [maxLat, maxLng]]
            const boundsObj = L.latLngBounds(bounds);
            map.fitBounds(boundsObj, { padding: [50, 50], maxZoom: 15 });
          }
        }
        
        // Make setView and fitBounds available globally
        window.setView = setView;
        window.fitBounds = fitBounds;
        
        // Initialize map immediately (don't wait for DOMContentLoaded for faster loading)
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initMap);
        } else {
          // DOM already loaded, initialize immediately
          initMap();
        }
        
        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            switch(data.type) {
              case 'updateMarkers':
                updateMarkers(data.markers);
                break;
              case 'updateCircles':
                updateCircles(data.circles);
                break;
              case 'setView':
                setView(data.lat, data.lng, data.zoom);
                break;
              case 'fitBounds':
                fitBounds(data.bounds);
                break;
            }
          } catch(e) {
            console.warn('Failed to handle message:', e);
          }
        });
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (webViewRef.current && !isLoading) {
      const allMarkers = [
        ...markers,
        ...(showUserLocation && userLocation ? [{
          id: 'user-location',
          lat: userLocation.lat,
          lng: userLocation.lng,
          title: 'Your Location',
          icon: 'user'
        }] : [])
      ];
      
      // Use injectedJavaScript to ensure the message is received
      const script = `
        (function() {
          if (window.updateMarkers) {
            window.updateMarkers(${JSON.stringify(allMarkers)});
          } else {
            window.addEventListener('message', function(event) {
              const data = JSON.parse(event.data);
              if (data.type === 'updateMarkers' && window.updateMarkers) {
                window.updateMarkers(data.markers);
              }
            });
          }
        })();
        true; // Required for injectedJavaScript
      `;
      
      webViewRef.current.injectJavaScript(`
        if (typeof updateMarkers === 'function') {
          updateMarkers(${JSON.stringify(allMarkers)});
        } else {
          window.postMessage(${JSON.stringify({type: 'updateMarkers', markers: allMarkers})}, '*');
        }
      `);
    }
  }, [markers, showUserLocation, userLocation, isLoading]);

  useEffect(() => {
    if (webViewRef.current && !isLoading) {
      webViewRef.current.injectJavaScript(`
        if (typeof updateCircles === 'function') {
          updateCircles(${JSON.stringify(circles)});
        } else {
          window.postMessage(${JSON.stringify({type: 'updateCircles', circles})}, '*');
        }
      `);
    }
  }, [circles, isLoading]);

  useEffect(() => {
    if (webViewRef.current && !isLoading) {
      webViewRef.current.injectJavaScript(`
        if (typeof updatePolygons === 'function') {
          updatePolygons(${JSON.stringify(polygons)});
        } else {
          window.postMessage(${JSON.stringify({type: 'updatePolygons', polygons})}, '*');
        }
      `);
    }
  }, [polygons, isLoading]);

  // Update map center when initialCenter changes
  useEffect(() => {
    if (webViewRef.current && !isLoading && initialCenter) {
      webViewRef.current.injectJavaScript(`
        if (typeof setView === 'function') {
          setView(${initialCenter.lat}, ${initialCenter.lng}, ${initialZoom});
        } else if (window.map) {
          window.map.setView([${initialCenter.lat}, ${initialCenter.lng}], ${initialZoom});
        }
      `);
    }
  }, [initialCenter.lat, initialCenter.lng, initialZoom, isLoading]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'markerPress':
          onMarkerPress?.(data.marker);
          break;
        case 'mapPress':
          onMapPress?.(data.lat, data.lng);
          break;
      }
    } catch (error) {
      console.warn('Failed to parse WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{html: htmlContent}}
        style={styles.map}
        onLoad={() => setIsLoading(false)}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
        scalesPageToFit={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}) as React.ForwardRefExoticComponent<LeafletMapProps & React.RefAttributes<LeafletMapRef>>;

// Set displayName for better debugging
LeafletMap.displayName = 'LeafletMap';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#F8FAFC',
  },
});

export default LeafletMap;
