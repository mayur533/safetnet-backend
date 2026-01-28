import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { SecurityOfficer } from '../../types/user.types';

export const profileService = {
  getProfile: async (securityId: string): Promise<SecurityOfficer> => {
    try {
      console.log('🔄 Fetching profile from /api/security/profile/');
      const response = await apiClient.get(API_ENDPOINTS.GET_PROFILE);
      console.log('📥 Profile response:', response.data);

      // Map UserProfileSerializer response to SecurityOfficer interface
      const backendData = response.data;
      const officer: SecurityOfficer = {
        security_id: String(backendData.id), // User ID
        name: backendData.name || backendData.username, // Full name or username fallback
        email_id: backendData.email,
        mobile: backendData.phone || '',
        security_role: backendData.role === 'security_officer' ? 'guard' : 'guard',
        geofence_id: backendData.geofence_ids?.[0] || '',
        user_image: undefined, // Not provided by UserProfileSerializer
        status: backendData.is_active ? 'active' : 'inactive',
        badge_number: backendData.username,
        shift_schedule: 'Day Shift', // Default value
        stats: {
          total_responses: 0, // Default values - would need separate API call
          avg_response_time: 0,
          active_hours: 0,
          area_coverage: 0,
        },
        geofence_name: backendData.geofences?.[0]?.name || undefined,
        assigned_geofence: backendData.geofences?.[0] ? {
          id: backendData.geofences[0].id,
          name: backendData.geofences[0].name,
        } : undefined,
        // Additional fields from UserProfileSerializer
        date_joined: backendData.date_joined,
        last_login: backendData.last_login,
      };

      console.log('✅ Mapped profile data to SecurityOfficer format:', officer);
      return officer;
    } catch (error: any) {
      console.error('❌ Failed to fetch profile:', error.message || error);
      console.error('Error details:', error?.response?.data || error);
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