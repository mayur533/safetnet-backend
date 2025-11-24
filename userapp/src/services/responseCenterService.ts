import {useResponseCenterStore} from '../stores/responseCenterStore';

type ScheduleHandle = ReturnType<typeof setTimeout>;

const scheduledTimers = new Map<string, ScheduleHandle[]>();

const clearTimers = (requestId: string) => {
  const timers = scheduledTimers.get(requestId);
  if (timers) {
    timers.forEach((handle) => clearTimeout(handle));
  }
  scheduledTimers.delete(requestId);
};

const scheduleProgression = (requestId: string) => {
  const store = useResponseCenterStore.getState();
  const timers: ScheduleHandle[] = [];

  const pushTimer = (delay: number, callback: () => void) => {
    const handle = setTimeout(callback, delay);
    timers.push(handle);
  };

  pushTimer(4000, () => {
    void store
      .updateStatus(requestId, 'acknowledged', 'Responder desk acknowledged the alert.')
      .catch((error) => console.warn('Response center status update failed', error));
  });

  pushTimer(10000, () => {
    void store
      .updateStatus(requestId, 'responder_assigned', 'Responder Maya S. is dialing you now.', {
        responderName: 'Maya Sharma',
      })
      .catch((error) => console.warn('Response center status update failed', error));
  });

  pushTimer(18000, () => {
    void store
      .updateStatus(requestId, 'connecting', 'Connecting a 3-way line with your primary contact.')
      .catch((error) => console.warn('Response center status update failed', error));
  });

  pushTimer(25000, () => {
    void store
      .updateStatus(requestId, 'connected', 'Responder joined the call. Stay on the line.')
      .catch((error) => console.warn('Response center status update failed', error));
  });

  pushTimer(36000, () => {
    void store
      .resolveRequest(requestId, 'resolved')
      .catch((error) => console.warn('Response center resolve failed', error));
    clearTimers(requestId);
  });

  scheduledTimers.set(requestId, timers);
};

export interface ResponseCenterPayload {
  incidentId: string;
  message: string;
  smsSent: boolean;
  callPlaced: boolean;
  recipients: string[];
}

export const notifyResponseCenter = async (payload: ResponseCenterPayload) => {
  const store = useResponseCenterStore.getState();
  await store.load();

  const active = store.getActiveRequest();
  if (active) {
    await store.appendNote(
      active.id,
      'Additional incident received. Our team is monitoring multiple updates from you.',
    );
    return active;
  }

  const request = await store.createRequest(payload);
  scheduleProgression(request.id);
  return request;
};

export const cancelActiveResponseRequest = async () => {
  const store = useResponseCenterStore.getState();
  const active = store.getActiveRequest();
  if (!active) {
    return;
  }
  clearTimers(active.id);
  await store.resolveRequest(active.id, 'cancelled');
};

export const markResponseRequestFailed = async (requestId: string, note?: string) => {
  clearTimers(requestId);
  const store = useResponseCenterStore.getState();
  await store.resolveRequest(requestId, 'failed');
  if (note) {
    await store.appendNote(requestId, note);
  }
};


