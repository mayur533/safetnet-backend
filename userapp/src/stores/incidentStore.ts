import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';

export interface IncidentRecord {
  id: string;
  timestamp: number;
  message: string;
  smsSent: boolean;
  callPlaced: boolean;
  callNumber?: string;
  recipients: string[];
}

interface IncidentState {
  incidents: IncidentRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  addIncident: (
    incident: Omit<IncidentRecord, 'id' | 'timestamp'> & {timestamp?: number},
  ) => Promise<IncidentRecord>;
  clearIncidents: () => Promise<void>;
}

const STORAGE_KEY = '@incident-history';
const MAX_INCIDENTS = 50;

const persistIncidents = async (records: IncidentRecord[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('Failed to persist incidents', error);
  }
};

export const useIncidentStore = create<IncidentState>((set, get) => ({
  incidents: [],
  loaded: false,
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({incidents: [], loaded: true});
        return;
      }
      const parsed: IncidentRecord[] = JSON.parse(raw);
      set({incidents: parsed, loaded: true});
    } catch (error) {
      console.warn('Failed to load incidents', error);
      set({incidents: [], loaded: true});
    }
  },
  addIncident: async (incident) => {
    const record: IncidentRecord = {
      id: Date.now().toString(),
      timestamp: incident.timestamp ?? Date.now(),
      message: incident.message,
      smsSent: incident.smsSent,
      callPlaced: incident.callPlaced,
      callNumber: incident.callNumber,
      recipients: incident.recipients,
    };

    const next = [record, ...get().incidents].slice(0, MAX_INCIDENTS);
    set({incidents: next});
    await persistIncidents(next);
    return record;
  },
  clearIncidents: async () => {
    set({incidents: []});
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear incidents', error);
    }
  },
}));
