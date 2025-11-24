import {DeviceEventEmitter, EmitterSubscription} from 'react-native';

export const CHECK_IN_DUE_EVENT = 'check_in_due';

export type CheckInDuePayload = {
  id: string;
};

export const emitCheckInDue = (payload: CheckInDuePayload) => {
  DeviceEventEmitter.emit(CHECK_IN_DUE_EVENT, payload);
};

export const addCheckInDueListener = (
  handler: (payload: CheckInDuePayload) => void,
): EmitterSubscription => DeviceEventEmitter.addListener(CHECK_IN_DUE_EVENT, handler);





