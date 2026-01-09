import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import apiConfig from './config';

// Hardened Axios config for mobile + Render + TLS handshake
const axiosInstance = axios.create({
  baseURL: `${apiConfig.BASE_URL}/api/security`,
  timeout: 20000, // 20 seconds - Mobile + Render + TLS handshake = slow first request
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});


// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    // Get token from AsyncStorage (minimal logging for login speed)
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track logged 404 endpoints to avoid console spam
const logged404Endpoints = new Set<string>();
// Track logged network errors to avoid console spam
const loggedNetworkErrors = new Set<string>();

// Response interceptor - Handle errors (minimal logging for speed)
axiosInstance.interceptors.response.use(
  (response) => {
    // Don't log successful responses (faster, less console noise)
    return response;
  },
  async (error) => {
    // Handle 404 errors gracefully - don't spam console
    if (error.response && error.response.status === 404) {
      const method = (error.config && error.config.method) ? error.config.method.toUpperCase() : 'UNKNOWN';
      const url = (error.config && error.config.url) ? error.config.url : 'unknown';
      const endpoint = `${method} ${url}`;

      // Skip logging for optional endpoints that may not exist on backend
      const optionalEndpoints = [
        '/api/security/logout/',
        '/api/security/password-reset/',
        '/api/security/token/refresh/',
        '/api/security/geofence/', // Geofence endpoints may not be implemented
        '/api/geofence/', // Alternative geofence endpoints
      ];

      // Also check if URL contains geofence (to catch all geofence endpoint variations)
      const configUrl = (error.config && error.config.url) ? error.config.url : '';
      const isGeofenceEndpoint = configUrl.includes('/geofence');

      const isOptionalEndpoint = optionalEndpoints.some(function(opt) {
        return configUrl.includes(opt);
      });

      // Suppress 404 warnings for geofence endpoints (they're being tried but may not exist)
      // Only log 404 once per endpoint, and skip optional/geofence endpoints
      if (!isOptionalEndpoint && !isGeofenceEndpoint && !logged404Endpoints.has(endpoint)) {
        console.warn(`[API] Endpoint not found (404): ${endpoint} - Using fallback data`);
        logged404Endpoints.add(endpoint);
      }
      // Geofence endpoints are silently ignored (no warning spam)
      // Don't log the full HTML response for 404s - it's just noise
    } else if (error.response) {
      // Server responded with error status (non-404)
      const method = (error.config && error.config.method) ? error.config.method.toUpperCase() : 'UNKNOWN';
      const url = (error.config && error.config.url) ? error.config.url : 'unknown';
      console.error(`[API Error] ${error.response.status} ${method} ${url}`);
      // Only log response data if it's not HTML (HTML 404 pages are not useful)
      if (typeof error.response.data === 'string' && error.response.data.includes('<!doctype html>')) {
        // Skip logging HTML error pages
      } else {
        console.error(`[API Error] Response:`, error.response.data);
      }
    } else if (error.request) {
      // Request made but no response received (network error)
      const method = (error.config && error.config.method) ? error.config.method.toUpperCase() : 'UNKNOWN';
      const url = (error.config && error.config.url) ? error.config.url : ((error.config && error.config.baseURL) ? error.config.baseURL : 'unknown');
      const endpoint = `${method} ${url}`;
      // Only log network errors once per endpoint to avoid spam
      if (!loggedNetworkErrors.has(endpoint)) {
        loggedNetworkErrors.add(endpoint);
        console.warn(`[API Network] Connection timeout/error for: ${endpoint}`);
        console.warn(`[API Network] Backend may be sleeping (Render free tier takes 10-30s to wake up)`);
        const baseURL = (error.config && error.config.baseURL) ? error.config.baseURL : '';
        const configUrl = (error.config && error.config.url) ? error.config.url : '';
        console.warn(`[API Network] URL: ${baseURL}${configUrl}`);
        console.warn(`[API Network] Wait 30 seconds and try again, or check Render dashboard`);
      }
    } else {
      // Something else happened
      console.error(`[API Error]`, error.message);
    }

    if (error.response && error.response.status === 401) {
      await AsyncStorage.clear();
      // Navigate to login - will be handled by navigation
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;