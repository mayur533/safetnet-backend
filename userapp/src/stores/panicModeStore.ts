import {create} from 'zustand';

interface PanicModeState {
  active: boolean;
  startedAt: number | null;
  intervalSeconds: number;
  loopId: ReturnType<typeof setInterval> | null;
  start: (intervalSeconds?: number) => void;
  stop: () => void;
}

export const usePanicModeStore = create<PanicModeState>((set, get) => ({
  active: false,
  startedAt: null,
  intervalSeconds: 5,
  loopId: null,
  start: (intervalSeconds) => {
    if (get().active) {
      return;
    }
    set({
      active: true,
      startedAt: Date.now(),
      intervalSeconds: intervalSeconds ?? get().intervalSeconds,
    });
  },
  stop: () => {
    const loopId = get().loopId;
    if (loopId) {
      clearInterval(loopId);
    }
    set({
      active: false,
      startedAt: null,
      loopId: null,
    });
  },
}));

