import {DeviceEventEmitter, Vibration} from 'react-native';
import {usePanicModeStore} from '../stores/panicModeStore';
import {dispatchSOSAlert} from './sosDispatcher';

const PANIC_EVENT = 'panic_mode_loop';

const emitPanicEvent = (sequence: number) => {
  DeviceEventEmitter.emit(PANIC_EVENT, {sequence});
};

export const addPanicModeListener = (listener: (payload: {sequence: number}) => void) =>
  DeviceEventEmitter.addListener(PANIC_EVENT, listener);

export const startPanicMode = async () => {
  const store = usePanicModeStore.getState();
  if (store.active) {
    return;
  }
  store.start();
  let sequence = 0;
  const loop = setInterval(async () => {
    sequence += 1;
    emitPanicEvent(sequence);
    try {
      Vibration.vibrate([0, 400, 200, 400], false);
      await dispatchSOSAlert('PANIC MODE: automated emergency update.');
    } catch (error) {
      console.warn('Panic mode dispatch failed', error);
    }
  }, store.intervalSeconds * 1000);
  usePanicModeStore.setState({loopId: loop});
};

export const stopPanicMode = () => {
  usePanicModeStore.getState().stop();
};


