import {AppState, AppStateStatus} from 'react-native';
import {useCheckInStore} from '../stores/checkInStore';
import {emitCheckInDue} from './checkInEventBus';

const INTERVAL_MS = 60 * 1000;

let intervalRef: ReturnType<typeof setInterval> | null = null;
let currentAppState: AppStateStatus = AppState.currentState;
let appStateSubscription: {remove: () => void} | null = null;

const checkDueCheckIns = () => {
  const store = useCheckInStore.getState();
  const due = store.getDueCheckIns();
  due.forEach(async (checkIn) => {
    await store.setAwaitingResponse(checkIn.id, true);
    emitCheckInDue({id: checkIn.id});
  });
};

const handleAppStateChange = (nextAppState: AppStateStatus) => {
  currentAppState = nextAppState;
  if (nextAppState === 'active') {
    checkDueCheckIns();
  }
};

export const startCheckInScheduler = () => {
  if (intervalRef) {
    return;
  }
  checkDueCheckIns();
  intervalRef = setInterval(() => {
    if (currentAppState !== 'active') {
      return;
    }
    checkDueCheckIns();
  }, INTERVAL_MS);
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
};

export const stopCheckInScheduler = () => {
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
  }
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
};
