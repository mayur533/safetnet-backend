import {create} from 'zustand';

export interface EvidenceClip {
  id: string;
  startedAt: number;
  endedAt: number;
  uri: string;
  sizeBytes: number;
}

interface AVRecorderState {
  isRecording: boolean;
  startedAt: number | null;
  clips: EvidenceClip[];
  timerId: ReturnType<typeof setTimeout> | null;
  start: (durationSeconds?: number) => void;
  stop: () => void;
  clear: () => void;
}

export const useAVRecorderStore = create<AVRecorderState>((set, get) => ({
  isRecording: false,
  startedAt: null,
  clips: [],
  timerId: null,
  start: (durationSeconds = 60) => {
    if (get().isRecording) {
      return;
    }
    const startedAt = Date.now();
    const timerId = setTimeout(() => {
      get().stop();
    }, durationSeconds * 1000);
    set({
      isRecording: true,
      startedAt,
      timerId,
    });
  },
  stop: () => {
    const {isRecording, startedAt, clips, timerId} = get();
    if (timerId) {
      clearTimeout(timerId);
    }
    if (!isRecording || !startedAt) {
      set({isRecording: false, startedAt: null, timerId: null});
      return;
    }
    const endedAt = Date.now();
    const clip: EvidenceClip = {
      id: startedAt.toString(),
      startedAt,
      endedAt,
      uri: `safe://evidence/${startedAt}`,
      sizeBytes: Math.floor(Math.random() * 4_000_000) + 750_000,
    };
    set({
      clips: [clip, ...clips].slice(0, 10),
      isRecording: false,
      startedAt: null,
      timerId: null,
    });
  },
  clear: () => {
    const timerId = get().timerId;
    if (timerId) {
      clearTimeout(timerId);
    }
    set({
      isRecording: false,
      startedAt: null,
      clips: [],
      timerId: null,
    });
  },
}));


