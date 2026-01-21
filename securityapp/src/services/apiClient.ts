import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_API_CALLS, BACKEND_BASE_URL } from '../api/config';

// Single API config file using axios.create
const apiClient = axios.create({
  baseURL: `${BACKEND_BASE_URL}/api/security`,
  timeout: 20000, // 20 seconds for mobile + server response time
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    if (ENABLE_API_CALLS) {
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('token') ||
                   await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enhanced error logging
    console.error('API Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Request URL:', error.config?.url);
    console.error('Response Status:', error.response?.status);
    console.error('Response Data:', error.response?.data);

    // Handle 401 unauthorized
    if (error.response && error.response.status === 401) {
      await AsyncStorage.clear();
    }

    return Promise.reject(error);
  }
);

export default apiClient;