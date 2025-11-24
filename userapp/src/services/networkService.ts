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
  const state = await NetInfo.fetch();
  return {
    isConnected: state.isConnected ?? true,
    isInternetReachable: state.isInternetReachable ?? true,
  };
};





