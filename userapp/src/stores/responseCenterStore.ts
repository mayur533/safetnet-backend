import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {nanoid} from '../utils/id';

export type ResponseStatus =
  | 'initiated'
  | 'acknowledged'
  | 'responder_assigned'
  | 'connecting'
  | 'connected'
  | 'resolved'
  | 'failed'
  | 'cancelled';

export interface ResponseTimelineEntry {
  id: string;
  status: ResponseStatus;
  timestamp: number;
  note?: string;
}

export interface ResponseRequest {
  id: string;
  incidentId: string;
  message: string;
  smsSent: boolean;
  callPlaced: boolean;
  recipients: string[];
  startedAt: number;
  lastUpdatedAt: number;
  status: ResponseStatus;
  responderName?: string;
  timeline: ResponseTimelineEntry[];
}

interface CreateRequestPayload {
  incidentId: string;
  message: string;
  smsSent: boolean;
  callPlaced: boolean;
  recipients: string[];
}

interface UpdateStatusOptions {
  responderName?: string;
}

interface ResponseCenterState {
  loaded: boolean;
  requests: ResponseRequest[];
  activeRequestId: string | null;
  load: () => Promise<void>;
  getActiveRequest: () => ResponseRequest | null;
  createRequest: (payload: CreateRequestPayload) => Promise<ResponseRequest>;
  updateStatus: (
    id: string,
    status: ResponseStatus,
    note?: string,
    options?: UpdateStatusOptions,
  ) => Promise<ResponseRequest | null>;
  appendNote: (id: string, note: string) => Promise<ResponseRequest | null>;
  resolveRequest: (id: string, status?: Extract<ResponseStatus, 'resolved' | 'failed' | 'cancelled'>) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const STORAGE_KEY = '@response-center-requests';
const MAX_HISTORY = 20;

const persistRequests = async (requests: ResponseRequest[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (error) {
    console.warn('Failed to persist response center requests', error);
  }
};

const isActiveStatus = (status: ResponseStatus) =>
  !['resolved', 'failed', 'cancelled'].includes(status);

export const useResponseCenterStore = create<ResponseCenterState>((set, get) => ({
  loaded: false,
  requests: [],
  activeRequestId: null,
  load: async () => {
    if (get().loaded) {
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        set({requests: [], loaded: true, activeRequestId: null});
        return;
      }
      const parsed: ResponseRequest[] = JSON.parse(raw);
      const active = parsed.find((request) => isActiveStatus(request.status));
      set({
        requests: parsed,
        loaded: true,
        activeRequestId: active?.id ?? null,
      });
    } catch (error) {
      console.warn('Failed to load response center history', error);
      set({requests: [], loaded: true, activeRequestId: null});
    }
  },
  getActiveRequest: () => {
    const {requests, activeRequestId} = get();
    if (!activeRequestId) {
      return null;
    }
    return requests.find((request) => request.id === activeRequestId) ?? null;
  },
  createRequest: async (payload) => {
    const now = Date.now();
    const request: ResponseRequest = {
      id: nanoid(),
      incidentId: payload.incidentId,
      message: payload.message,
      smsSent: payload.smsSent,
      callPlaced: payload.callPlaced,
      recipients: payload.recipients,
      startedAt: now,
      lastUpdatedAt: now,
      status: 'initiated',
      timeline: [
        {
          id: nanoid(),
          status: 'initiated',
          timestamp: now,
          note: 'Request received by response center.',
        },
      ],
    };
    const next = [request, ...get().requests].slice(0, MAX_HISTORY);
    set({requests: next, activeRequestId: request.id});
    await persistRequests(next);
    return request;
  },
  updateStatus: async (id, status, note, options) => {
    const now = Date.now();
    let updatedRequest: ResponseRequest | null = null;
    const next = get()
      .requests.map((request) => {
        if (request.id !== id) {
          return request;
        }
        updatedRequest = {
          ...request,
          status,
          lastUpdatedAt: now,
          responderName: options?.responderName ?? request.responderName,
          timeline: [
            {
              id: nanoid(),
              status,
              timestamp: now,
              note,
            },
            ...request.timeline,
          ],
        };
        return updatedRequest;
      })
      .slice(0, MAX_HISTORY);
    const activeRequestId = isActiveStatus(status) ? id : null;
    set({requests: next, activeRequestId});
    await persistRequests(next);
    return updatedRequest;
  },
  appendNote: async (id, note) => {
    const now = Date.now();
    let updatedRequest: ResponseRequest | null = null;
    const next = get()
      .requests.map((request) => {
        if (request.id !== id) {
          return request;
        }
        updatedRequest = {
          ...request,
          lastUpdatedAt: now,
          timeline: [
            {
              id: nanoid(),
              status: request.status,
              timestamp: now,
              note,
            },
            ...request.timeline,
          ],
        };
        return updatedRequest;
      })
      .slice(0, MAX_HISTORY);
    set({requests: next});
    await persistRequests(next);
    return updatedRequest;
  },
  resolveRequest: async (id, status = 'resolved') => {
    const now = Date.now();
    const next = get()
      .requests.map((request) => {
        if (request.id !== id) {
          return request;
        }
        return {
          ...request,
          status,
          lastUpdatedAt: now,
          timeline: [
            {
              id: nanoid(),
              status,
              timestamp: now,
              note:
                status === 'resolved'
                  ? 'Responder confirmed situation is handled.'
                  : status === 'failed'
                  ? 'Response center could not complete the hand-off.'
                  : 'Request cancelled by user.',
            },
            ...request.timeline,
          ],
        };
      })
      .slice(0, MAX_HISTORY);
    set({requests: next, activeRequestId: null});
    await persistRequests(next);
  },
  clearHistory: async () => {
    set({requests: [], activeRequestId: null});
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear response center history', error);
    }
  },
}));


