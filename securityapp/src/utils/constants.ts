export const constants = {
  // API Timeouts
  API_TIMEOUT: 30000,

  // Location
  LOCATION_UPDATE_INTERVAL: 5000, // 5 seconds
  LOCATION_ACCURACY_THRESHOLD: 10, // meters

  // Alerts
  ALERT_REFRESH_INTERVAL: 10000, // 10 seconds
  MAX_ALERT_MESSAGE_LENGTH: 500,

  // Maps
  DEFAULT_MAP_ZOOM: 15,
  DEFAULT_MAP_DELTA: 0.01,

  // Storage Keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    USER_ID: 'userId',
    ROLE: 'role',
    REMEMBER_ME: 'rememberMe',
  },

  // Socket Events
  SOCKET_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    NEW_ALERT: 'new_alert',
    ALERT_UPDATED: 'alert_updated',
    LOCATION_UPDATE: 'location_update',
  },
};