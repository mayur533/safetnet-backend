import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { SecurityOfficer } from '../../types/user.types';

export const profileService = {
  getProfile: async (securityId: string): Promise<SecurityOfficer> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_PROFILE);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch profile:', error.message || error);
      throw error;
    }
  },

  updateProfile: async (securityId: string, updates: Partial<SecurityOfficer>) => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_PROFILE, updates);
      return { result: 'success', msg: 'Profile updated successfully' };
    } catch (error: any) {
      console.error('Failed to update profile:', error.message || error);
      throw error;
    }
  },
};