import React, {useEffect} from 'react';
import {useNetworkStatus} from '../../services/networkService';
import {useOfflineSosStore} from '../../stores/offlineSosStore';

const OfflineSosManager = () => {
  const {isConnected, isInternetReachable} = useNetworkStatus();
  const loadQueue = useOfflineSosStore((state) => state.load);
  const flushPending = useOfflineSosStore((state) => state.flushPending);
  const pendingCount = useOfflineSosStore((state) => state.pending.length);
  const loaded = useOfflineSosStore((state) => state.loaded);

  useEffect(() => {
    loadQueue().catch((error) => {
      console.warn('Failed to load offline SOS queue', error);
    });
  }, [loadQueue]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (!isConnected || !isInternetReachable) {
      return;
    }
    if (pendingCount === 0) {
      return;
    }
    flushPending().catch((error) => {
      console.warn('Failed to flush offline SOS queue', error);
    });
  }, [flushPending, isConnected, isInternetReachable, loaded, pendingCount]);

  return null;
};

export default OfflineSosManager;


