import {create} from 'zustand';
import {haversineDistanceMeters} from '../utils/geo';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingSession {
  start: LatLng;
  destination: LatLng;
  startedAt: number;
  etaMinutes: number;
}

interface DeviationAlert {
  distance: number;
  timestamp: number;
  autoEscalated: boolean;
}

interface LiveTrackingSettings {
  thresholdMeters: number;
  cooldownMs: number;
  autoEscalate: boolean;
}

interface LiveTrackingState {
  session: LiveTrackingSession | null;
  path: LatLng[];
  latest: LatLng | null;
  distanceTravelled: number;
  remainingDistance: number;
  deviation: DeviationAlert | null;
  deviationHistory: DeviationAlert[];
  isTracking: boolean;
  lastUpdatedAt: number | null;
  settings: LiveTrackingSettings;
  load: () => Promise<void>;
  initializeSession: (session: LiveTrackingSession) => Promise<void>;
  appendPoint: (point: LatLng) => Promise<void>;
  setDeviation: (alert: DeviationAlert | null) => Promise<void>;
  appendDeviationHistory: (alert: DeviationAlert) => Promise<void>;
  clearDeviationHistory: () => Promise<void>;
  updateSettings: (settings: Partial<LiveTrackingSettings>) => Promise<void>;
  stopSession: () => Promise<void>;
  clearAll: () => Promise<void>;
  reset: () => void;
}

export const useLiveTrackingStore = create<LiveTrackingState>((set, get) => ({
  session: null,
  path: [],
  latest: null,
  distanceTravelled: 0,
  remainingDistance: 0,
  deviation: null,
  deviationHistory: [],
  isTracking: false,
  lastUpdatedAt: null,
  settings: {
    thresholdMeters: 200,
    cooldownMs: 5 * 60 * 1000,
    autoEscalate: true,
  },
  load: async () => {
    set({
      session: null,
      path: [],
      latest: null,
      distanceTravelled: 0,
      remainingDistance: 0,
      deviation: null,
      deviationHistory: [],
      isTracking: false,
      lastUpdatedAt: null,
    });
  },
  initializeSession: async (session) => {
    set({
      session,
      path: [session.start],
      latest: session.start,
      distanceTravelled: 0,
      remainingDistance: haversineDistanceMeters(session.start, session.destination),
      deviation: null,
      deviationHistory: [],
      isTracking: true,
      lastUpdatedAt: Date.now(),
    });
  },
  appendPoint: async (point) => {
    const {path, session, distanceTravelled} = get();
    if (!session) {
      return;
    }
    const updatedPath = [...path, point];
    const lastPoint = path[path.length - 1] ?? session.start;
    const segmentDistance = haversineDistanceMeters(lastPoint, point);
    const travelled = distanceTravelled + segmentDistance;
    const remaining = haversineDistanceMeters(point, session.destination);
    set({
      path: updatedPath,
      latest: point,
      distanceTravelled: travelled,
      remainingDistance: remaining,
      lastUpdatedAt: Date.now(),
    });
  },
  setDeviation: async (alert) => {
    set({deviation: alert});
  },
  appendDeviationHistory: async (alert) => {
    set((state) => ({
      deviationHistory: [alert, ...state.deviationHistory].slice(0, 10),
    }));
  },
  clearDeviationHistory: async () => {
    set({deviationHistory: []});
  },
  updateSettings: async (update) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...update,
      },
    }));
  },
  stopSession: async () => {
    set({
      session: null,
      path: [],
      latest: null,
      distanceTravelled: 0,
      remainingDistance: 0,
      deviation: null,
      deviationHistory: [],
      isTracking: false,
      lastUpdatedAt: null,
    });
  },
  clearAll: async () => {
    await get().stopSession();
  },
  reset: () => {
    set({
      session: null,
      path: [],
      latest: null,
      distanceTravelled: 0,
      remainingDistance: 0,
      deviation: null,
      deviationHistory: [],
      isTracking: false,
      lastUpdatedAt: null,
      settings: {
        thresholdMeters: 200,
        cooldownMs: 5 * 60 * 1000,
        autoEscalate: true,
      },
    });
  },
}));
