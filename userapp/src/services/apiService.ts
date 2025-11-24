/**
 * API Service for User App
 * Handles all API calls to the backend
 */

// Import AsyncStorage with error handling
let AsyncStorage: any;
try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.error('Failed to import AsyncStorage in apiService:', e);
  // Create a mock AsyncStorage that won't crash
  AsyncStorage = {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  };
}

const API_BASE_URL = __DEV__
  ? 'http://192.168.0.125:8000/api/users' // Use device IP for physical device
  : 'http://localhost:8000/api/users';

interface LoginResponse {
  message: string;
  user: {
    id: number;
    name?: string;
    email: string;
    phone?: string | null;
    plantype?: string;
    planexpiry?: string | null;
    is_premium?: boolean;
    is_paid_user?: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    location?: {
      longitude?: number;
      latitude?: number;
    } | null;
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

interface RegisterResponse {
  message: string;
  user: {
    id: number;
    name?: string;
    email: string;
    phone?: string;
    plantype?: string;
    planexpiry?: string;
    is_premium?: boolean;
  };
  tokens: {
    access: string;
    refresh: string;
  };
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Set tokens after login/register
   */
  async setTokens(access: string, refresh: string) {
    this.accessToken = access;
    this.refreshToken = refresh;
    // Store in AsyncStorage for persistence
    try {
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Get stored tokens
   */
  async loadTokens() {
    try {
      const access = await AsyncStorage.getItem('access_token');
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (access && refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  /**
   * Clear tokens on logout
   */
  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Make authenticated API request
   */
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Read response text first (can only read once)
      const text = await response.text();
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          if (text) {
            const errorData = JSON.parse(text);
            // Extract error message from various possible formats
            if (errorData.detail) {
              errorMessage = errorData.detail;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.non_field_errors) {
              errorMessage = Array.isArray(errorData.non_field_errors) 
                ? errorData.non_field_errors[0] 
                : errorData.non_field_errors;
            } else if (typeof errorData === 'object') {
              // Get first error message from object
              const firstKey = Object.keys(errorData)[0];
              if (firstKey) {
                const firstError = errorData[firstKey];
                errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
              }
            }
          }
        } catch (parseError) {
          // If parsing fails, use the text as error message
          errorMessage = text || errorMessage;
        }
        
        if (response.status === 401 && this.refreshToken) {
          // Try to refresh token
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // Retry request with new token
            headers['Authorization'] = `Bearer ${this.accessToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });
            const retryText = await retryResponse.text();
            if (!retryResponse.ok) {
              try {
                const retryError = retryText ? JSON.parse(retryText) : {};
                throw new Error(retryError.detail || retryError.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
              } catch (parseError) {
                throw new Error(retryText || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
              }
            }
            return retryText ? JSON.parse(retryText) : {};
          }
        }
        
        throw new Error(errorMessage);
      }

      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL.replace('/users', '/auth')}/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: this.refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access) {
          this.accessToken = data.access;
          try {
            await AsyncStorage.setItem('access_token', data.access);
          } catch (error) {
            console.error('Error saving refreshed token:', error);
          }
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
    return false;
  }

  /**
   * User login
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Attempting login with:', { email, url: `${API_BASE_URL}/login/` });
      const response = await this.request('/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response:', response);

      if (response.tokens) {
        await this.setTokens(response.tokens.access, response.tokens.refresh);
      }

      return response;
    } catch (error: any) {
      console.error('Login error:', error.message || error);
      throw error;
    }
  }

  /**
   * User registration
   */
  async register(
    name: string,
    email: string,
    phone: string,
    password: string,
    passwordConfirm: string
  ): Promise<RegisterResponse> {
    const response = await this.request('/', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        phone,
        password,
        password_confirm: passwordConfirm,
        plantype: 'free', // Default to free
      }),
    });

    if (response.tokens) {
      await this.setTokens(response.tokens.access, response.tokens.refresh);
    }

    return response;
  }

  /**
   * Get user profile
   */
  async getProfile(): Promise<any> {
    return this.request('/profile/');
  }

  /**
   * Update user profile
   */
  async updateProfile(data: any): Promise<any> {
    return this.request('/profile/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get family contacts
   */
  async getFamilyContacts(userId: number): Promise<any> {
    return this.request(`/${userId}/family_contacts/`);
  }

  /**
   * Add family contact
   */
  async addFamilyContact(userId: number, contact: any): Promise<any> {
    return this.request(`/${userId}/family_contacts/`, {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  /**
   * Trigger SOS
   */
  async triggerSOS(userId: number, data: { longitude?: number; latitude?: number; notes?: string }): Promise<any> {
    return this.request(`/${userId}/sos/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get SOS events
   */
  async getSOSEvents(userId: number): Promise<any> {
    return this.request(`/${userId}/sos_events/`);
  }

  /**
   * Subscribe to premium plan
   */
  async subscribe(planType: 'premium-monthly' | 'premium-annual', promoCode?: string): Promise<any> {
    return this.request('/subscribe/', {
      method: 'POST',
      body: JSON.stringify({
        plan_type: planType,
        promo_code: promoCode || '',
      }),
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<any> {
    return this.request('/subscribe/cancel/', {
      method: 'POST',
    });
  }

  /**
   * Start live location sharing
   */
  async startLiveLocationShare(userId: number, durationMinutes: number, sharedWithUserIds?: number[]): Promise<any> {
    return this.request(`/${userId}/live_location/start/`, {
      method: 'POST',
      body: JSON.stringify({
        duration_minutes: durationMinutes,
        shared_with_user_ids: sharedWithUserIds || [],
      }),
    });
  }

  /**
   * Get active live location sessions
   */
  async getLiveLocationSessions(userId: number): Promise<any> {
    return this.request(`/${userId}/live_location/`);
  }

  /**
   * Get geofences (Premium only)
   */
  async getGeofences(userId: number): Promise<any> {
    return this.request(`/${userId}/geofences/`);
  }

  /**
   * Create geofence (Premium only)
   */
  async createGeofence(userId: number, data: {
    name: string;
    center_location: { longitude: number; latitude: number };
    radius_meters: number;
    alert_on_entry?: boolean;
    alert_on_exit?: boolean;
  }): Promise<any> {
    return this.request(`/${userId}/geofences/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Send community alert
   */
  async sendCommunityAlert(userId: number, data: {
    message: string;
    location: { longitude: number; latitude: number };
    radius_meters?: number;
  }): Promise<any> {
    return this.request(`/${userId}/community_alert/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update family contact
   */
  async updateFamilyContact(userId: number, contactId: number, contact: any): Promise<any> {
    return this.request(`/${userId}/family_contacts/${contactId}/`, {
      method: 'PATCH',
      body: JSON.stringify(contact),
    });
  }

  /**
   * Delete family contact
   */
  async deleteFamilyContact(userId: number, contactId: number): Promise<any> {
    return this.request(`/${userId}/family_contacts/${contactId}/`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();

export type {LoginResponse, RegisterResponse};

