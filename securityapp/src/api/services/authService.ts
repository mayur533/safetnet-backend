import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import apiConfig from '../config';
import { LoginPayload, LoginResponse, DjangoLoginResponse } from '../../types/user.types';
import { storage } from '../../utils/storage';
import { constants } from '../../utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// All mock data has been removed - app relies on real API calls only

// Network connectivity test
export const testBackendConnectivity = async (): Promise<{available: boolean, message: string}> => {
  try {
    console.log('🔍 Testing backend connectivity...');
    console.log('🌐 Testing URL:', `${apiConfig.BASE_URL}/api/security/login/`);

    // Try a simple HEAD request to test connectivity
    const response = await apiClient.head('/login/', { timeout: 10000 });

    console.log('✅ Backend is reachable!');
    console.log('📊 Response status:', response.status);

    return {
      available: true,
      message: 'Backend service is responding'
    };
  } catch (error: any) {
    console.error('❌ Backend connectivity test failed:');

    if (error.response) {
      return {
        available: false,
        message: `Backend responded with error: ${error.response.status}`
      };
    } else if (error.request) {
      return {
        available: false,
        message: 'Cannot connect to backend. Service may be sleeping or down.'
      };
    } else {
      return {
        available: false,
        message: `Connection error: ${error.message}`
      };
    }
  }
};

export const authService = {
  login: async (credentials: LoginPayload): Promise<LoginResponse> => {
    console.log('🔐 LOGIN ATTEMPT - Real API call to backend');
    console.log('🌐 API Endpoint:', `${apiConfig.BASE_URL}/api/security${API_ENDPOINTS.LOGIN}`);
    console.log('👤 Credentials:', { email: credentials.email, password: '[HIDDEN]' });

    try {
      // Django REST API call
      // Send username and password (Django expects username field, not email)
      console.log('📡 Making POST request to login endpoint...');
      const response = await apiClient.post<DjangoLoginResponse>(
        API_ENDPOINTS.LOGIN,
        {
          username: credentials.email, // Use email as username (Django accepts both)
          password: credentials.password,
        }
      );

      console.log('✅ Login API call successful!');
      console.log('📊 Response status:', response.status);
      console.log('📦 Response data keys:', Object.keys(response.data || {}));

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
    } catch (error: any) {
      console.error('❌ LOGIN FAILED - Detailed Error Analysis:');
      console.error('🔍 Error Type:', error.constructor.name);
      console.error('💬 Error Message:', error.message);

      // Detailed error analysis
      if (error.response) {
        // Server responded with error status
        console.error('📊 SERVER RESPONSE ERROR:');
        console.error('   Status:', error.response.status);
        console.error('   Status Text:', error.response.statusText);
        console.error('   Headers:', error.response.headers);
        console.error('   Data:', JSON.stringify(error.response.data, null, 2));

        const status = error.response.status;
        const data = error.response.data;

        if (status === 400) {
          return {
            result: 'failed',
            role: 'user',
            msg: data?.detail || data?.message || data?.non_field_errors?.[0] || 'Invalid credentials',
          };
        } else if (status === 401) {
          return {
            result: 'failed',
            role: 'user',
            msg: 'Invalid username or password',
          };
        } else if (status === 404) {
          return {
            result: 'failed',
            role: 'user',
            msg: 'Login endpoint not found. Backend may not be properly deployed.',
          };
        } else if (status === 429) {
          return {
            result: 'failed',
            role: 'user',
            msg: 'Too many login attempts. Please try again later.',
          };
        } else if (status >= 500) {
          return {
            result: 'failed',
            role: 'user',
            msg: 'Server error. Backend service may be down.',
          };
        }
      } else if (error.request) {
        // Request made but no response received
        console.error('🌐 NETWORK ERROR (No Response):');
        console.error('   Request Config:', {
          url: error.request._url || error.request.url,
          method: error.request._method || 'POST',
          timeout: error.request._timeout || 'unknown'
        });

        // This is likely a Render service sleeping or network issue
        console.error('🚨 POSSIBLE CAUSES:');
        console.error('   1. Render free tier service is sleeping (wake it up)');
        console.error('   2. Backend server is down');
        console.error('   3. Network connectivity issues');
        console.error('   4. CORS policy blocking requests');

        return {
          result: 'failed',
          role: 'user',
          msg: 'Cannot connect to server. The backend service may be sleeping (Render free tier) or unavailable. Please try again in 30-60 seconds.',
        };
      } else {
        // Something else happened
        console.error('⚙️ UNKNOWN ERROR:', error);
        return {
          result: 'failed',
          role: 'user',
          msg: 'An unexpected error occurred. Please try again.',
        };
      }

      return {
        result: 'failed',
        role: 'user',
        msg: 'Login failed. Please check your credentials and try again.',
      };
    }
  },

  logout: async (userId: string, role: string) => {
    try {
      // Attempt API logout (may not exist, which is fine)
      await apiClient.post(API_ENDPOINTS.LOGOUT, {}, {
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
    try {
      // Django REST API forgot password - call the actual backend endpoint
      const response = await apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, {
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
      const response = await apiClient.post(API_ENDPOINTS.REFRESH_TOKEN, {
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