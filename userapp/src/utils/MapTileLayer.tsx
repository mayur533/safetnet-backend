import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {UrlTile} from './mapComponents';
import NetInfo from '@react-native-community/netinfo';

interface MapTileLayerProps {
  children?: React.ReactNode;
  maxZoom?: number;
  zIndex?: number;
}

const MapTileLayer: React.FC<MapTileLayerProps> = ({ 
  children, 
  maxZoom = 19, 
  zIndex = -1 
}) => {
  const [tileProviderIndex, setTileProviderIndex] = React.useState(0);
  const [tileError, setTileError] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(true);

  // Check network connectivity
  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    
    return unsubscribe;
  }, []);

  // Multiple tile providers for redundancy
  const tileProviders = [
    {
      name: 'OpenStreetMap',
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    {
      name: 'OpenStreetMap DE',
      urlTemplate: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors'
    },
    {
      name: 'CartoDB',
      urlTemplate: 'https://tile.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      attribution: '© CartoDB'
    }
  ];

  const currentProvider = tileProviders[tileProviderIndex];

  const handleTileError = () => {
    console.warn(`[MapTileLayer] Tile provider ${currentProvider.name} failed, trying next provider`);
    if (tileProviderIndex < tileProviders.length - 1) {
      setTileProviderIndex(prev => prev + 1);
      setTileError(false);
    } else {
      setTileError(true);
    }
  };

  const retryLoading = () => {
    setTileProviderIndex(0);
    setTileError(false);
  };

  if (!isConnected) {
    return (
      <View style={styles.fallbackContainer}>
        <MaterialIcons name="wifi-off" size={48} color="#6B7280" />
        <Text style={styles.fallbackText}>No Internet Connection</Text>
        <Text style={styles.fallbackSubtext}>Map tiles require internet access</Text>
      </View>
    );
  }

  if (tileError) {
    return (
      <View style={styles.fallbackContainer}>
        <MaterialIcons name="map" size={48} color="#6B7280" />
        <Text style={styles.fallbackText}>Map tiles unavailable</Text>
        <Text style={styles.fallbackSubtext}>All tile providers failed</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryLoading}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <UrlTile
        urlTemplate={currentProvider.urlTemplate}
        maximumZ={maxZoom}
        zIndex={zIndex}
        tileSize={256}
        // @ts-ignore - onError prop exists but may not be typed
        onError={handleTileError}
      />
      {children}
    </>
  );
};

const styles = StyleSheet.create({
  fallbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  fallbackSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default MapTileLayer;
