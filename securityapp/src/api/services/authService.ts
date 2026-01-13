import axiosInstance from '../axios.config';
import { API_ENDPOINTS } from '../endpoints';
import { LoginPayload, LoginResponse, DjangoLoginResponse } from '../../types/user.types';
import { storage } from '../../utils/storage';
import { constants } from '../../utils/constants';
import { mockLogin } from '../../utils/mockData';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENABLE_API_CALLS } from '../config';

// Use global API enable flag
const USE_MOCK_DATA = !ENABLE_API_CALLS;

export const authService = {
  login: async (credentials: LoginPayload): Promise<LoginResponse> => {
    // Use mock data if enabled
    if (USE_MOCK_DATA) {
      const mockResponse = await mockLogin(credentials.email, credentials.password);

      if (mockResponse.result === 'success') {
        // Store token
        await storage.setAuthToken('mock_bearer_token_' + Date.now());
        if (mockResponse.security_id) {
          await storage.setUserId(mockResponse.security_id);
        }
        await storage.setItem(constants.STORAGE_KEYS.ROLE, mockResponse.role);
      }

      return mockResponse;
    }

    // Django REST API call
    // Send username and password (Django expects username field, not email)
    const response = await axiosInstance.post<DjangoLoginResponse>(
      API_ENDPOINTS.LOGIN,
      {
        username: credentials.email, // Use email as username (Django accepts both)
        password: credentials.password,
      }
    );

    // Django returns: { access, refresh, user: { id, username, email, role, ... } }
    const djangoResponse = response.data;

    if (djangoResponse.access && djangoResponse.user) {
      // Store access token (JWT)
      await AsyncStorage.setItem('token', djangoResponse.access);
      await AsyncStorage.setItem('refresh_token', djangoResponse.refresh);
      await storage.setAuthToken(djangoResponse.access);

      // Store user ID
      if (djangoResponse.user.id) {
        await storage.setUserId(djangoResponse.user.id.toString());
      }

      // Store role
      if (djangoResponse.user.role) {
        await storage.setItem(constants.STORAGE_KEYS.ROLE, djangoResponse.user.role);
      }

      // Convert Django response to legacy format for compatibility
      const legacyResponse: LoginResponse = {
        result: 'success',
        role: djangoResponse.user.role === 'security_officer' ? 'security' : 'user',
        security_id: djangoResponse.user.id.toString(),
        name: djangoResponse.user.first_name || djangoResponse.user.username,
        email_id: djangoResponse.user.email || djangoResponse.user.username,
        mobile: djangoResponse.user.mobile || '',
        security_role: djangoResponse.user.role || 'security_officer',
        geofence_id: djangoResponse.user.geofence_id?.toString() || '',
        user_image: djangoResponse.user.user_image || '',
        status: djangoResponse.user.status || 'active',
        // Include Django format fields
        access: djangoResponse.access,
        refresh: djangoResponse.refresh,
        user: djangoResponse.user,
      };

      return legacyResponse;
    }

    // If response doesn't match expected format, return error
    return {
      result: 'failed',
      role: 'user',
      msg: 'Invalid response from server',
    };
  },

  logout: async (userId: string, role: string) => {
    if (USE_MOCK_DATA) {
      // Mock logout - just clear storage
      await storage.clear();
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refresh_token');
      return { result: 'success', msg: 'Logged out successfully' };
    }

    try {
      // Django REST API logout (endpoint may not exist - that's OK)
      await axiosInstance.post(API_ENDPOINTS.LOGOUT, {}, {
        validateStatus: (status) => status < 500, // Accept 404 as OK
      });
    } catch (error: any) {
      // 404 is expected if endpoint doesn't exist - silently handle it
      if (error.response?.status !== 404) {
        console.log('Logout API call failed, clearing local storage anyway');
      }
    }

    // Clear all storage regardless of API response
    await storage.clear();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refresh_token');

    return { result: 'success', msg: 'Logged out successfully' };
  },

  forgotPassword: async (email: string) => {
    if (USE_MOCK_DATA) {
      // Mock forgot password
      await new Promise((resolve) => setTimeout(() => resolve(undefined), 1000));
      return {
        result: 'success',
        msg: 'Password reset link sent to your email (mock)',
      };
    }

    try {
      // Django REST API forgot password - call the actual backend endpoint
      const response = await axiosInstance.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email: email.trim().toLowerCase(),
      });

      // Handle successful response (200, 201, etc.)
      if (response.status >= 200 && response.status < 300) {
        const message = response.data?.message ||
                       response.data?.detail ||
                       response.data?.msg ||
                       'Password reset link sent to your email';

        return {
          result: 'success',
          msg: message,
        };
      }

      // Unexpected status code
      throw new Error('Unexpected response from server');
    } catch (error: any) {
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        // 404 - Endpoint doesn't exist
        if (status === 404) {
          throw new Error('Password reset endpoint not found. Please contact support.');
        }

        // 400 - Bad request (e.g., email not found, invalid email)
        if (status === 400) {
          const errorMsg = data?.email?.[0] ||
                          data?.non_field_errors?.[0] ||
                          data?.detail ||
                          data?.message ||
                          'Invalid email address or email not found';
          throw new Error(errorMsg);
        }

        // 500 - Server error
        if (status >= 500) {
          throw new Error('Server error. Please try again later.');
        }

        // Other 4xx errors
        const errorMsg = data?.detail ||
                        data?.message ||
                        data?.error ||
                        'Failed to send password reset link';
        throw new Error(errorMsg);
      }

      // Network error or other issues
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        throw new Error('Network error. Please check your connection and try again.');
      }

      // Re-throw other errors
      throw error;
    }
  },

  // Refresh JWT token
  refreshToken: async (refreshToken: string): Promise<string | null> => {
    try {
      const response = await axiosInstance.post(API_ENDPOINTS.REFRESH_TOKEN, {
        refresh: refreshToken,
      });

      if (response.data.access) {
        // Store new access token
        await AsyncStorage.setItem('token', response.data.access);
        await storage.setAuthToken(response.data.access);
        return response.data.access;
      }

      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  },
};