import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { Alert } from '../../types/alert.types';

export const alertServiceWithGeofenceFilter = {

  // Get all alerts with backend-authoritative area filtering
  // Backend automatically identifies officer from authentication context
  getAlerts: async (): Promise<Alert[]> => {
    try {
      console.log('📡 GET /sos/ - Fetching alerts with backend-authoritative area filtering...');
      console.log('🔐 Backend will identify officer from authentication context');
      
      // Add cache-busting timestamp only
      // Backend will handle officer identification and geofence filtering automatically
      const timestamp = Date.now();
      let apiUrl = `${API_ENDPOINTS.LIST_SOS}?_t=${timestamp}`;
      
      console.log(`🗺️ Backend filtering enabled - No frontend parameters needed`);
      
      const response = await apiClient.get(apiUrl);
      
      let alertsData: any[] = [];

      // Handle different response structures
      console.log('🔍 Backend Response Analysis:');
      console.log(`   📊 Response type: ${typeof response.data}`);
      console.log(`   📊 Response keys: ${Object.keys(response.data)}`);
      console.log(`   📊 Has results: ${!!response.data.results}`);
      console.log(`   📊 Is array: ${Array.isArray(response.data)}`);
      
      // Handle paginated response (Django REST Framework style)
      if (response.data.results && Array.isArray(response.data.results)) {
        alertsData = response.data.results;
        console.log('📄 Paginated response detected');
        console.log(`📊 Pagination info:`, {
          count: response.data.count,
          next: response.data.next ? 'YES' : 'NO',
          previous: response.data.previous ? 'YES' : 'NO',
          pageSize: response.data.results?.length || 0
        });
        
        // If there are more pages, fetch them all (backend maintains filtering)
        if (response.data.next) {
          console.log('🔄 Fetching additional pages with backend filtering...');
          let nextPage = response.data.next;
          let allAlerts = [...alertsData];
          
          while (nextPage) {
            try {
              const nextPageResponse = await apiClient.get(nextPage);
              if (nextPageResponse.data.results && Array.isArray(nextPageResponse.data.results)) {
                allAlerts = [...allAlerts, ...nextPageResponse.data.results];
                nextPage = nextPageResponse.data.next;
                console.log(`📄 Fetched page ${Math.ceil(allAlerts.length / response.data.results.length)}, total alerts: ${allAlerts.length}`);
              } else {
                break;
              }
            } catch (pageError) {
              console.error('❌ Error fetching additional pages:', pageError);
              break;
            }
          }
          
          alertsData = allAlerts;
          console.log(`✅ Total alerts after fetching all pages: ${alertsData.length}`);
        }
      } else if (Array.isArray(response.data)) {
        alertsData = response.data;
        console.log('📄 Direct array response detected');
      } else {
        console.warn('⚠️ Unexpected API response format for getAlerts');
        console.log('🔍 Full response data:', response.data);
        return [];
      }

      console.log(`📥 Backend-filtered alerts received: ${alertsData.length} alerts`);
      console.log(`📥 Response timestamp: ${new Date().toISOString()}`);
      
      // Log filtered alerts details
      if (alertsData.length > 0) {
        console.log('📋 First 3 alerts from backend:');
        alertsData.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. ID:${alert.id} Status:${alert.status} Type:${alert.alert_type} Location:${alert.location_lat},${alert.location_long}`);
        });
      }

      // Transform alerts to ensure they have the correct fields
      const transformedAlerts = alertsData.map((alert: any) => ({
        ...alert,
        id: typeof alert.id === 'number' ? alert.id : parseInt(alert.id) || alert.pk || alert.alert_id,
        log_id: alert.log_id || '',
        user_id: alert.user_id || '',
        user_name: alert.user_name || alert.user || 'Unknown User',
        user_email: alert.user_email || '',
        user_phone: alert.user_phone || '',
        alert_type: alert.alert_type || 'security',
        priority: alert.priority || 'medium',
        message: alert.message || 'Alert message',
        location: alert.location || {
          latitude: alert.latitude || alert.location_lat || 0,
          longitude: alert.longitude || alert.location_long || 0,
          address: alert.address || 'Unknown location'
        },
        timestamp: alert.timestamp || alert.created_at || new Date().toISOString(),
        status: alert.status || 'pending',
        geofence_id: alert.geofence_id || '',
        created_at: alert.created_at || alert.timestamp || new Date().toISOString(),
        updated_at: alert.updated_at
      }));

      console.log('✅ Backend-authoritative alerts processed:', transformedAlerts.length, 'alerts');
      console.log('🕒 Latest alert timestamp:', transformedAlerts.length > 0 ? 
        transformedAlerts[0].created_at : 'No alerts');
      
      // Log filtering results
      console.log('🗺️ BACKEND-AUTHORITATIVE FILTERING RESULTS:');
      console.log(`   🔐 Officer Identification: Backend (from auth context)`);
      console.log(`   🗺️ Geofence Loading: Backend (from database)`);
      console.log(`   📨 Alerts Received: ${transformedAlerts.length}`);
      console.log(`   🔍 Backend Filtering: AUTHENTICATED`);
      console.log(`   🛡️ Security: Frontend unaware of geofence logic`);
      
      return transformedAlerts;
    } catch (error: any) {
      console.error('❌ Failed to fetch alerts with backend-authoritative filtering:', error.message || error);
      console.error('🔍 Error details:', error.response?.data || error);
      
      // Check for SSL connection errors
      if (error.message && error.message.includes('SSL connection has been closed unexpectedly')) {
        console.log('🔐 SSL connection error detected - using mock data fallback');
        return getMockAlerts();
      }
      
      // Check for network/connection errors
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
        console.log('🌐 Network error detected - using mock data fallback');
        return getMockAlerts();
      }
      
      // Return empty array to force error visibility
      console.log('🚨 Backend filtering failed - returning empty array');
      return [];
    }
  },

  // Get recent alerts with backend-authoritative filtering
  getRecentAlerts: async (limit: number = 5): Promise<Alert[]> => {
    try {
      console.log(`📡 GET /sos/ - Fetching recent alerts with backend-authoritative filtering (limit: ${limit})`);
      
      let apiUrl = API_ENDPOINTS.LIST_SOS;
      
      // Backend will handle all filtering based on authenticated officer
      apiUrl += `?limit=${limit}`;
      
      const response = await apiClient.get(apiUrl);
      
      let alertsData: any[] = [];

      if (response.data.results && Array.isArray(response.data.results)) {
        alertsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        alertsData = response.data;
      } else {
        console.warn('Unexpected API response format for getRecentAlerts');
        return [];
      }

      // Transform the alerts
      const transformedAlerts = alertsData.map((alert: any) => ({
        ...alert,
        id: typeof alert.id === 'number' ? alert.id : parseInt(alert.id) || alert.pk || alert.alert_id,
        log_id: alert.log_id || '',
        user_id: alert.user_id || '',
        user_name: alert.user_name || alert.user || 'Unknown User',
        user_email: alert.user_email || '',
        user_phone: alert.user_phone || '',
        alert_type: alert.alert_type || 'security',
        priority: alert.priority || 'medium',
        message: alert.message || 'Alert message',
        location: alert.location || {
          latitude: alert.latitude || alert.location_lat || 0,
          longitude: alert.longitude || alert.location_long || 0,
          address: alert.address || 'Unknown location'
        },
        timestamp: alert.timestamp || alert.created_at || new Date().toISOString(),
        status: alert.status || 'pending',
        geofence_id: alert.geofence_id || '',
        created_at: alert.created_at || alert.timestamp || new Date().toISOString(),
        updated_at: alert.updated_at
      }));

      console.log(`✅ Fetched ${transformedAlerts.length} recent alerts with backend-authoritative filtering`);
      return transformedAlerts;
    } catch (error: any) {
      console.error('❌ Failed to fetch recent alerts with backend-authoritative filtering:', error.message || error);
      return [];
    }
  },

  // Get active alerts with backend-authoritative filtering
  getActiveAlerts: async (): Promise<Alert[]> => {
    try {
      let apiUrl = API_ENDPOINTS.GET_ACTIVE_SOS;
      
      // Backend will identify officer and filter automatically
      const response = await apiClient.get(apiUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching active alerts with backend-authoritative filtering:', error);
      throw error;
    }
  },

  // Get resolved alerts with backend-authoritative filtering
  getResolvedAlerts: async (): Promise<Alert[]> => {
    try {
      let apiUrl = API_ENDPOINTS.GET_RESOLVED_SOS;
      
      // Backend will identify officer and filter automatically
      const response = await apiClient.get(apiUrl);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching resolved alerts with backend-authoritative filtering:', error);
      console.error('Error details:', error.response?.data || error);
      return [];
    }
  },

  // Other methods remain the same as original alertService
  getAlertById: async (id: string): Promise<Alert> => {
    try {
      console.log(`📡 GET /sos/${id} - Fetching alert details`);
      const response = await apiClient.get(API_ENDPOINTS.GET_SOS.replace('{id}', String(id)));
      
      // Transform backend data to match frontend Alert interface
      const alertData = response.data;
      console.log('🔍 Raw backend alert data:', alertData);
      
      // Transform location fields to location object
      if (alertData.location_lat && alertData.location_long) {
        const lat = parseFloat(String(alertData.location_lat));
        const lng = parseFloat(String(alertData.location_long));
        
        // Validate GPS coordinates
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.error('❌ Invalid GPS coordinates in alert data:', { 
            original_lat: alertData.location_lat,
            original_lng: alertData.location_long,
            parsed_lat: lat,
            parsed_lng: lng
          });
          alertData.location = {
            latitude: 0,
            longitude: 0,
            address: 'Invalid GPS coordinates'
          };
        } else {
          alertData.location = {
            latitude: lat,
            longitude: lng,
            address: alertData.location_address || `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          };
          
          console.log('✅ Transformed location object:', alertData.location);
        }
      } else {
        console.warn('⚠️ No location coordinates found in alert data');
        alertData.location = {
          latitude: 0,
          longitude: 0,
          address: 'Unknown location - GPS coordinates missing'
        };
      }
      
      return alertData;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  acceptAlert: async (id: string): Promise<Alert> => {
    try {
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_SOS.replace('{id}', String(id)), {
        status: 'accepted'
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting alert:', error);
      throw error;
    }
  },

  createAlert: async (alertData: {
    alert_type: 'emergency' | 'security' | 'general' | 'area_user_alert';
    message: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    location_lat?: number;
    location_long?: number;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
    expires_at?: string; // For area-based alerts
  }): Promise<Alert> => {
    // Format data to match backend expectations
    const apiData: any = {
      alert_type: alertData.alert_type === 'general' ? 'normal' : 
                  alertData.alert_type === 'area_user_alert' ? 'area_user_alert' : 
                  alertData.alert_type,
      message: alertData.message,
      description: alertData.description || alertData.message,
      location_lat: alertData.latitude || alertData.location_lat,
      location_long: alertData.longitude || alertData.location_long,
      location: alertData.location || 'Current Location',
      priority: alertData.priority || 'medium',
    };

    // Add expiry for area-based alerts
    if (alertData.alert_type === 'area_user_alert' && alertData.expires_at) {
      apiData.expires_at = alertData.expires_at;
    }

    console.log('📍 GPS Alert Creation Debug:');
    console.log('   📤 Alert Type:', apiData.alert_type);
    console.log('   📤 Sending latitude:', apiData.location_lat);
    console.log('   📤 Sending longitude:', apiData.location_long);
    console.log('   📍 Location source:', apiData.location);
    console.log('   ⏰ Expires at:', apiData.expires_at || 'Not set');

    // Validate that we have actual GPS coordinates
    if (!apiData.location_lat || !apiData.location_long) {
      throw new Error('GPS coordinates are required to create an alert. Please enable location services.');
    }

    try {
      console.log('📡 Creating alert with data:', apiData);
      const response = await apiClient.post(API_ENDPOINTS.CREATE_SOS, apiData);

      console.log('📥 POST /sos/ response:', response.data);
      console.log('✅ Alert created, response:', response.data);

      // Transform the response to ensure it matches our Alert interface
      const createdAlert = {
        ...response.data,
        id: typeof response.data.id === 'number' ? response.data.id : parseInt(response.data.id) || response.data.pk || response.data.alert_id,
        log_id: response.data.log_id || '',
        user_id: response.data.user_id || '',
        user_name: response.data.user_name || response.data.user || 'Security Officer',
        user_email: response.data.user_email || '',
        user_phone: response.data.user_phone || '',
        alert_type: response.data.alert_type || apiData.alert_type,
        priority: response.data.priority || (apiData.alert_type === 'emergency' || apiData.alert_type === 'area_user_alert' ? 'high' : 'medium'),
        message: response.data.message || apiData.message,
        location: response.data.location || {
          latitude: apiData.location_lat,
          longitude: apiData.location_long,
          address: apiData.location
        },
        timestamp: response.data.timestamp || response.data.created_at || new Date().toISOString(),
        status: response.data.status || 'pending',
        geofence_id: response.data.geofence_id || '',
        created_at: response.data.created_at || response.data.timestamp || new Date().toISOString(),
        updated_at: response.data.updated_at,
        // Area-based alert specific fields
        affected_users_count: response.data.affected_users_count,
        notification_sent: response.data.notification_sent,
        expires_at: response.data.expires_at,
      };

      console.log('🔄 Transformed created alert:', createdAlert.id);
      console.log('📊 Area-based alert info:', {
        type: createdAlert.alert_type,
        affected_users: createdAlert.affected_users_count,
        notification_sent: createdAlert.notification_sent,
        expires_at: createdAlert.expires_at
      });
      
      return createdAlert;
    } catch (error: any) {
      console.error('Failed to create alert:', error.message || error);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
  },

  updateAlert: async (id: string | number, updateData: Partial<Alert>): Promise<Alert> => {
    try {
      console.log('📡 Updating alert:', id, updateData);
      
      const alertId = typeof id === 'string' ? parseInt(id) : id;
      
      const apiData: any = {};
      
      if (updateData.status) {
        apiData.status = updateData.status;
      }
      if (updateData.message) {
        apiData.message = updateData.message;
      }
      if (updateData.alert_type) {
        apiData.alert_type = updateData.alert_type === 'normal' ? 'normal' : updateData.alert_type;
      }
      if (updateData.priority) {
        apiData.priority = updateData.priority;
      }
      
      const response = await apiClient.patch(API_ENDPOINTS.UPDATE_SOS.replace('{id}', String(alertId)), apiData);
      
      const updatedAlert = {
        ...response.data,
        id: typeof response.data.id === 'number' ? response.data.id : parseInt(response.data.id) || response.data.pk || response.data.alert_id,
        log_id: response.data.log_id || '',
        user_id: response.data.user_id || '',
        user_name: response.data.user_name || response.data.user || 'Security Officer',
        user_email: response.data.user_email || '',
        user_phone: response.data.user_phone || '',
        alert_type: response.data.alert_type || updateData.alert_type || 'security',
        priority: response.data.priority || updateData.priority || 'medium',
        message: response.data.message || updateData.message || 'Alert message',
        location: response.data.location || {
          latitude: response.data.location_lat || 0,
          longitude: response.data.location_long || 0,
          address: response.data.location || 'Current Location'
        },
        timestamp: response.data.timestamp || response.data.created_at || new Date().toISOString(),
        status: response.data.status || updateData.status || 'pending',
        geofence_id: response.data.geofence_id || '',
        created_at: response.data.created_at || response.data.timestamp || new Date().toISOString(),
        updated_at: response.data.updated_at
      };

      console.log('✅ Alert updated successfully:', updatedAlert.id);
      return updatedAlert;
    } catch (error: any) {
      console.error('Failed to update alert:', error.message || error);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
  },

  deleteAlert: async (id: number): Promise<void> => {
    try {
      console.log('📡 Deleting alert:', id);
      await apiClient.delete(API_ENDPOINTS.DELETE_SOS.replace('{id}', String(id)));
      console.log('✅ Alert deleted successfully');
    } catch (error: any) {
      console.error('Error deleting alert:', error);

      if (error.response?.status === 404) {
        console.error('DELETE endpoint not implemented on backend');
        throw new Error('Delete functionality is not yet available. This feature will be implemented with the next backend update.');
      } else if (error.response?.status === 405) {
        console.error('DELETE method not allowed');
        throw new Error('Delete operation is not permitted on this alert.');
      } else if (error.response?.status >= 500) {
        console.error('Server error during delete');
        throw new Error('Server error occurred. Please try again later.');
      } else {
        throw error;
      }
    }
  },

  resolveAlert: async (id: string | number): Promise<Alert> => {
    try {
      console.log('📡 Resolving alert:', id);
      
      const alertId = typeof id === 'string' ? parseInt(id) : id;
      
      const response = await apiClient.patch(API_ENDPOINTS.RESOLVE_SOS.replace('{id}', String(alertId)));
      
      const resolvedAlert = {
        ...response.data,
        id: typeof response.data.id === 'number' ? response.data.id : parseInt(response.data.id) || response.data.pk || response.data.alert_id,
        log_id: response.data.log_id || '',
        user_id: response.data.user_id || '',
        user_name: response.data.user_name || response.data.user || 'Security Officer',
        user_email: response.data.user_email || '',
        user_phone: response.data.user_phone || '',
        alert_type: response.data.alert_type || 'security',
        priority: response.data.priority || 'medium',
        message: response.data.message || 'Alert message',
        location: response.data.location || {
          latitude: response.data.location_lat || 0,
          longitude: response.data.location_long || 0,
          address: response.data.location || 'Current Location'
        },
        timestamp: response.data.timestamp || response.data.created_at || new Date().toISOString(),
        status: 'completed',
        geofence_id: response.data.geofence_id || '',
        created_at: response.data.created_at || response.data.timestamp || new Date().toISOString(),
        updated_at: response.data.updated_at
      };

      console.log('✅ Alert resolved successfully:', resolvedAlert.id);
      return resolvedAlert;
    } catch (error: any) {
      console.error('Failed to resolve alert:', error.message || error);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
  },

  getDashboardData: async (): Promise<any> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DASHBOARD);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error.message || error);
      return {
        stats: {
          total_sos_handled: 0,
          active_cases: 0,
          resolved_cases_this_week: 0,
          average_response_time_minutes: 0,
          unread_notifications: 0
        },
        recent_alerts: [],
        officer_info: {
          name: 'Security Officer',
          badge_number: 'N/A',
          status: 'active'
        }
      };
    }
  },
};

// Mock alerts function for SSL/network error fallback
const getMockAlerts = (): Alert[] => {
  console.log('🎭 Using mock alerts data due to SSL/network issues');
  
  const mockAlerts: Alert[] = [
    {
      id: 999,
      log_id: 'mock_001',
      user_id: '1',
      user_name: 'Test User',
      user_email: 'test@example.com',
      user_phone: '+1234567890',
      alert_type: 'security',
      priority: 'high',
      message: 'Security assistance needed',
      description: 'Mock alert for testing geofence display',
      location: {
        latitude: 18.5204,
        longitude: 73.8567,
        address: 'Mock Location, Pune'
      },
      location_lat: 18.5204,
      location_long: 73.8567,
      timestamp: new Date().toISOString(),
      status: 'pending',
      geofence_id: '7',
      geofence: {
        id: '7',
        name: 'Jay Ganesh Vision',
        description: 'Test geofence for mock data',
        center_latitude: 18.5204,
        center_longitude: 73.8567,
        radius: 500,
        geofence_type: 'polygon',
        polygon_json: JSON.stringify({
          type: 'Polygon',
          coordinates: [[
            [73.8560, 18.5200], // [longitude, latitude]
            [73.8570, 18.5200],
            [73.8570, 18.5210],
            [73.8560, 18.5210],
            [73.8560, 18.5200]
          ]]
        }),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];
  
  console.log('✅ Generated', mockAlerts.length, 'mock alerts');
  return mockAlerts;
};
