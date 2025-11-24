import {DeviceEventEmitter, EmitterSubscription} from 'react-native';

export const LIVE_TRACKING_DEVIATION_EVENT = 'live_tracking_deviation';

export interface LiveTrackingDeviationPayload {
  distance: number;
  timestamp: number;
  autoEscalated: boolean;
}

export const emitLiveTrackingDeviation = (payload: LiveTrackingDeviationPayload) => {
  DeviceEventEmitter.emit(LIVE_TRACKING_DEVIATION_EVENT, payload);
};

export const addLiveTrackingDeviationListener = (
  listener: (payload: LiveTrackingDeviationPayload) => void,
): EmitterSubscription => DeviceEventEmitter.addListener(LIVE_TRACKING_DEVIATION_EVENT, listener);




