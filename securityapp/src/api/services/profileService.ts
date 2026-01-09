import axiosInstance from '../axios.config';
import { API_ENDPOINTS } from '../endpoints';
import { SecurityOfficer } from '../../types/user.types';
import { ENABLE_API_CALLS } from '../config';

export const profileService = {
  getProfile: async (securityId: string): Promise<SecurityOfficer> => {
    // Skip API call if disabled - return mock profile
    if (!ENABLE_API_CALLS) {
      // Return a basic mock profile structure
      return {
        security_id: securityId,
        name: 'Mock User',
        email_id: 'mock@example.com',
        mobile: '+1234567890',
        security_role: 'guard',
        geofence_id: 'GEO001',
        status: 'active',
      } as SecurityOfficer;
    }

    try {
      console.log('[ProfileService] Fetching profile for security_id:', securityId);
      // Use GET for profile endpoint (standard REST)
      const response = await axiosInstance.get(API_ENDPOINTS.GET_PROFILE);
      console.log('[ProfileService] Profile API Response:', JSON.stringify(response.data, null, 2));

      return response.data;
    } catch (error: any) {
      console.error('[ProfileService] Error fetching profile:', error);
      if (error?.response) {
        console.error('[ProfileService] Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },

  updateProfile: async (securityId: string, updates: Partial<SecurityOfficer>) => {
    // Skip API call if disabled
    if (!ENABLE_API_CALLS) {
      return { result: 'success', msg: 'Profile updated (mock mode)' };
    }

    try {
      console.log('[ProfileService] Updating profile for security_id:', securityId);
      console.log('[ProfileService] Update payload:', JSON.stringify(updates, null, 2));

      // Use PATCH method for updating profile (standard REST)
      const response = await axiosInstance.patch(API_ENDPOINTS.UPDATE_PROFILE, updates);

      console.log('[ProfileService] Update response:', response.data);
      return { result: 'success', msg: 'Profile updated successfully' };
    } catch (error: any) {
      console.error('[ProfileService] Error updating profile:', error);
      if (error?.response) {
        console.error('[ProfileService] Error response:', error.response.status, error.response.data);
      }
      throw error;
    }
  },
};