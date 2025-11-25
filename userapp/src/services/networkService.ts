import NetInfo from '@react-native-community/netinfo';
import {useEffect, useState} from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return status;
};

export const checkNetworkStatus = async (): Promise<NetworkStatus> => {
  try {
    // Check if NetInfo is available
    if (!NetInfo || typeof NetInfo.fetch !== 'function') {
      console.warn('NetInfo is not available, assuming network is reachable');
      return {
        isConnected: true,
        isInternetReachable: true,
      };
    }
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? true,
      isInternetReachable: state.isInternetReachable ?? true,
    };
  } catch (error) {
    console.warn('Error checking network status:', error);
    // Return default values if NetInfo fails
    return {
      isConnected: true,
      isInternetReachable: true,
    };
  }
};





