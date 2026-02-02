import apiClient from '../apiClient';
import { API_ENDPOINTS } from '../endpoints';
import { Alert } from '../../types/alert.types';

export const alertService = {

  // Get all alerts with cache-busting
  getAlerts: async (): Promise<Alert[]> => {
    try {
      console.log('📡 GET /sos/ - Fetching alerts from API with cache-busting...');
      
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const response = await apiClient.get(`${API_ENDPOINTS.LIST_SOS}?_t=${timestamp}`);
      
      let alertsData: any[] = [];

      // CRITICAL: Handle different response structures
      console.log('🔍 CRITICAL DEBUG - Raw Response Analysis:');
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
        
        // CRITICAL: If there are more pages, fetch them all
        if (response.data.next) {
          console.log('🔄 Fetching additional pages...');
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

      console.log(`📥 Raw API response: ${alertsData.length} alerts`);
      console.log(`📥 Response timestamp: ${new Date().toISOString()}`);
      
      // Log full response structure for debugging
      console.log('🔍 Full API response structure:', {
        hasResults: !!response.data.results,
        isArray: Array.isArray(response.data),
        resultsLength: response.data.results?.length || 0,
        directArrayLength: Array.isArray(response.data) ? response.data.length : 0,
        fullResponse: response.data
      });
      
      // Log first few alerts details
      if (alertsData.length > 0) {
        console.log('📋 First 3 alerts from API:');
        alertsData.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. ID:${alert.id} Status:${alert.status} Type:${alert.alert_type} Created:${alert.created_at}`);
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

      console.log('✅ Fetched alerts:', transformedAlerts.length, 'alerts');
      console.log('🕒 Latest alert timestamp:', transformedAlerts.length > 0 ? 
        transformedAlerts[0].created_at : 'No alerts');
      
      // CRITICAL: Log exact counts for debugging
      console.log('🔍 CRITICAL DEBUG - API Response Analysis:');
      console.log(`   📊 Total alerts from API: ${transformedAlerts.length}`);
      console.log(`   📊 Response structure: ${response.data.results ? 'PAGINATED' : 'DIRECT_ARRAY'}`);
      console.log(`   📊 Full response keys: ${Object.keys(response.data)}`);
      
      if (response.data.results) {
        console.log(`   📊 Pagination count: ${response.data.count}`);
        console.log(`   📊 Current page size: ${response.data.results.length}`);
      }
      
      return transformedAlerts;
    } catch (error: any) {
      console.error('❌ Failed to fetch alerts:', error.message || error);
      console.error('🔍 Error details:', error.response?.data || error);
      
      // CRITICAL: NO FALLBACK - return empty array to force error visibility
      // This ensures we don't show stale cached alerts when API fails
      console.log('🚨 CRITICAL: API failed - returning empty array to prevent stale data');
      return [];
    }
  },

  // Get recent alerts only
  getRecentAlerts: async (limit: number = 5): Promise<Alert[]> => {
    try {
      console.log(`📡 GET /sos/ - Fetching all alerts and taking recent ${limit}`);
      const response = await apiClient.get(API_ENDPOINTS.LIST_SOS);
      
      let alertsData: any[] = [];

      if (response.data.results && Array.isArray(response.data.results)) {
        alertsData = response.data.results;
      } else if (Array.isArray(response.data)) {
        alertsData = response.data;
      } else {
        console.warn('Unexpected API response format for getRecentAlerts');
        return [];
      }

      // Sort by created_at timestamp (newest first) and take the limit
      const sortedAlerts = alertsData.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || a.timestamp).getTime();
        const dateB = new Date(b.created_at || b.timestamp).getTime();
        return dateB - dateA;
      });

      const recentAlerts = sortedAlerts.slice(0, limit);

      // Transform the alerts to ensure they have the correct fields
      const transformedAlerts = recentAlerts.map((alert: any) => ({
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

      console.log(`✅ Fetched ${transformedAlerts.length} recent alerts`);
      return transformedAlerts;
    } catch (error: any) {
      console.error('❌ Failed to fetch recent alerts:', error.message || error);
      return [];
    }
  },

  // Get active alerts only
  getActiveAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_ACTIVE_SOS);
      return response.data;
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw error;
    }
  },

  // Get resolved alerts only
  getResolvedAlerts: async (): Promise<Alert[]> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.GET_RESOLVED_SOS);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching resolved alerts:', error);
      console.error('Error details:', error.response?.data || error);
      return [];
    }
  },

  // Get alert by ID
  getAlertById: async (id: string): Promise<Alert> => {
    try {
      console.log(`📡 GET /sos/${id} - Fetching alert details`);
      const response = await apiClient.get(API_ENDPOINTS.GET_SOS.replace('{id}', String(id)));
      
      // Transform backend data to match frontend Alert interface
      const alertData = response.data;
      console.log('🔍 Raw backend alert data:', alertData);
      
      // Transform location fields to location object
      if (alertData.location_lat && alertData.location_long) {
        const lat = parseFloat(alertData.location_lat);
        const lng = parseFloat(alertData.location_long);
        
        alertData.location = {
          latitude: lat,
          longitude: lng,
          address: alertData.location_address || `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        };
        
        console.log('✅ Transformed location object:', alertData.location);
        console.log('📍 Exact GPS coordinates:', {
          latitude: lat,
          longitude: lng,
          precision: '6 decimal places (≈1m accuracy)'
        });
      } else {
        console.warn('⚠️ No location coordinates found in alert data');
        alertData.location = {
          latitude: 0,
          longitude: 0,
          address: 'Unknown location - GPS coordinates missing'
        };
      }
      
      // Ensure geofence data is properly included
      if (alertData.geofence_id && !alertData.geofence) {
        console.log('🗺️ Alert has geofence_id but no geofence object - backend should include full geofence data');
      }
      
      console.log('🎯 Final alert data for map:', {
        id: alertData.id,
        hasLocation: !!(alertData.location?.latitude && alertData.location?.longitude),
        coordinates: alertData.location?.latitude && alertData.location?.longitude 
          ? `${alertData.location.latitude}, ${alertData.location.longitude}`
          : 'None',
        geofence: alertData.geofence?.name || 'None'
      });
      
      return alertData;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Accept/respond to alert
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

  // Create alert
  createAlert: async (alertData: {
    alert_type: 'emergency' | 'security' | 'general';
    message: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    location_lat?: number;
    location_long?: number;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
  }): Promise<Alert> => {
    // Format data to match backend expectations
    const apiData = {
      alert_type: alertData.alert_type === 'general' ? 'normal' : alertData.alert_type,
      message: alertData.message,
      description: alertData.description || alertData.message,
      location_lat: alertData.latitude || alertData.location_lat,
      location_long: alertData.longitude || alertData.location_long,
      location: alertData.location || 'Current Location',
      priority: alertData.priority || 'medium',
    };

    console.log('📍 GPS Alert Creation Debug:');
    console.log('   📤 Sending latitude:', apiData.location_lat);
    console.log('   📤 Sending longitude:', apiData.location_long);
    console.log('   📍 Location source:', apiData.location);

    // Validate that we have actual GPS coordinates
    if (!apiData.location_lat || !apiData.location_long) {
      throw new Error('GPS coordinates are required to create an alert. Please enable location services.');
    }

    try {
      console.log('📡 Creating alert with data:', apiData);
      console.log('📤 POST /sos/ request payload:', JSON.stringify(apiData, null, 2));

      const response = await apiClient.post(API_ENDPOINTS.CREATE_SOS, apiData);

      console.log('📥 POST /sos/ response:', {
        status: response.status,
        data: response.data,
        id: response.data.id,
        alert_type: response.data.alert_type,
        message: response.data.message
      });
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
        priority: response.data.priority || (apiData.alert_type === 'emergency' ? 'high' : 'medium'),
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
        updated_at: response.data.updated_at
      };

      console.log('🔄 Transformed created alert:', createdAlert.id);
      return createdAlert;
    } catch (error: any) {
      console.error('Failed to create alert:', error.message || error);
      console.error('Error details:', error.response?.data || error);
      throw error;
    }
  },

  // Update alert
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

  // Delete alert
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

  // Resolve alert
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

  // Get dashboard data
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
