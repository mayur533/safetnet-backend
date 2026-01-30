import { create } from 'zustand';
import { Alert } from '../types/alert.types';

interface AlertsState {
  // State
  alerts: Alert[]; // Keep as array, handle undefined in component
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  fetchAlerts: () => Promise<void>;
  createAlert: (alertData: {
    alert_type: 'emergency' | 'security' | 'general';
    message: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
  }) => Promise<Alert>;
  updateAlert: (id: string | number, updateData: Partial<Alert>) => Promise<void>;
  deleteAlert: (id: string | number) => Promise<void>;
  resolveAlert: (id: string | number) => Promise<void>;

  // Helper actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed properties
  getRecentAlerts: (limit?: number) => Alert[];
  getAlertById: (id: string | number) => Alert | undefined;
  getPendingAlertsCount: () => number;
  getResolvedAlertsCount: () => number;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  // Initial state - start with empty array
  alerts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Fetch alerts from API with cache-busting
  fetchAlerts: async () => {
    const { alerts, lastUpdated } = get();
    
    // Skip fetch if we have recent data (less than 30 seconds old)
    const now = new Date();
    const lastUpdateTime = lastUpdated ? new Date(lastUpdated) : new Date(0);
    const timeSinceLastUpdate = now.getTime() - lastUpdateTime.getTime();
    const thirtySeconds = 30 * 1000;
    
    if (alerts.length > 0 && timeSinceLastUpdate < thirtySeconds) {
      console.log('📋 Using cached alerts data (recently updated)');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      console.log('🔄 Fetching alerts from API with fresh data...');
      const { alertService } = await import('../api/services/alertService');
      const alerts = await alertService.getAlerts();

      // ALWAYS replace the alerts array with fresh data - never merge
      console.log('🔄 Replacing entire alerts array with fresh data...');
      set({
        alerts: alerts || [], // Always use fresh data, never merge with old
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Fetched ${alerts.length} fresh alerts from API`);
      console.log(`🕒 Store updated at: ${new Date().toISOString()}`);
      console.log(`🔍 Store now contains ${get().alerts?.length || 0} alerts`);
      
      // CRITICAL: Log exact counts for debugging
      console.log('🔍 CRITICAL DEBUG - Store Update Analysis:');
      console.log(`   📊 Alerts received from API: ${alerts.length}`);
      console.log(`   📊 Alerts stored in Zustand: ${get().alerts?.length || 0}`);
      console.log(`   📊 Store replacement: ${alerts.length === (get().alerts?.length || 0) ? 'SUCCESS' : 'MISMATCH'}`);
      
      if (alerts.length > 0) {
        console.log('📋 Latest alerts from API:');
        alerts.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. ID:${alert.id} "${alert.message?.substring(0, 30)}..." (${alert.status}) - ${alert.created_at}`);
        });
        
        // Log alert status distribution
        const statusCounts = alerts.reduce((acc: Record<string, number>, alert) => {
          acc[alert.status] = (acc[alert.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Alert status distribution:', statusCounts);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch alerts:', error);
      
      // Handle specific error cases
      let errorMessage = 'Failed to fetch alerts';
      if (error?.message?.includes('401') || error?.message?.includes('Authentication')) {
        errorMessage = 'Authentication expired. Please login again.';
      } else if (error?.message?.includes('403')) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (error?.message?.includes('404')) {
        errorMessage = 'Alerts service not found. Please check server connection.';
      } else if (error?.message?.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      // IMPORTANT: Do NOT clear existing alerts on fetch error
      // Keep existing alerts so they don't disappear from UI
      set({
        isLoading: false,
        error: errorMessage
      });
    }
  },

  // Create alert with optimistic update
  createAlert: async (alertData) => {
    console.log('🚀 Creating alert via API:', alertData);

    try {
      // Make API call first (no optimistic updates)
      const { alertService } = await import('../api/services/alertService');
      const createdAlert = await alertService.createAlert(alertData);
      console.log('✅ Alert created successfully via API:', createdAlert.id);

      // Add the real alert to the store
      set((state) => ({
        alerts: [createdAlert, ...state.alerts.filter(a => a.id !== createdAlert.id)],
        error: null,
        lastUpdated: new Date().toISOString()
      }));

      console.log('📦 Alert added to store with real data');
      console.log('🔄 Total alerts in store after creation:', get().alerts.length);
      
      // IMPORTANT: Fetch fresh data to ensure store is fully synchronized
      // This prevents issues where some alerts might be missing from the UI
      console.log('🔄 Fetching fresh alerts after creation to ensure synchronization...');
      setTimeout(() => {
        get().fetchAlerts();
      }, 500); // Small delay to ensure backend has processed the creation
      
      return createdAlert;

    } catch (error: any) {
      console.error('❌ Alert creation failed:', error);
      console.error('Error details:', { message: error?.message, response: error?.response, stack: error?.stack });
      
      // Don't update store on error to keep existing alerts visible
      set({ error: error.message || 'Failed to create alert' });
      throw error;
    }
  },

  // Update alert with optimistic update
  updateAlert: async (id, updateData) => {
    console.log('🔄 Updating alert optimistically:', id, updateData);

    const { alerts } = get();
    const originalAlert = alerts.find(alert => alert.id === id);

    if (!originalAlert) {
      throw new Error(`Alert with id ${id} not found`);
    }

    // Store original for rollback
    const rollbackAlert = { ...originalAlert };

    // Optimistically update in store
    const optimisticAlert = { ...originalAlert, ...updateData };
    set((state) => ({
      alerts: state.alerts.map(alert =>
        alert.id === id ? optimisticAlert : alert
      ),
      error: null
    }));

    console.log('⚡ Alert updated optimistically in UI');

    try {
      // Make actual API call for update
      console.log('📡 Making API call to update alert:', id);
      const { alertService } = await import('../api/services/alertService');
      const updatedAlert = await alertService.updateAlert(id, updateData);
      console.log('✅ Alert updated successfully via API:', updatedAlert.id);

      // Replace optimistic update with real API response
      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === id ? updatedAlert : alert
        ),
        lastUpdated: new Date().toISOString()
      }));

      console.log('🔄 Optimistic update replaced with API response');

    } catch (error: any) {
      console.error('❌ Alert update failed, rolling back:', error);
      console.error('Error details:', { message: error?.message, response: error?.response, stack: error?.stack });

      // Rollback: Restore original alert
      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === id ? rollbackAlert : alert
        ),
        error: error?.message || error?.response?.data?.detail || error?.response?.data?.message || 'Failed to update alert'
      }));

      throw error;
    }
  },

  // Delete alert with optimistic update
  deleteAlert: async (id) => {
    console.log('🗑️ Deleting alert optimistically:', id);

    const { alerts } = get();
    const alertToDelete = alerts.find(alert => alert.id === id);

    if (!alertToDelete) {
      throw new Error(`Alert with id ${id} not found`);
    }

    // Store for potential rollback
    const rollbackAlert = { ...alertToDelete };

    // Optimistically remove from store
    set((state) => ({
      alerts: state.alerts.filter(alert => alert.id !== id),
      error: null
    }));

    console.log('⚡ Alert removed optimistically from UI');

    try {
      // Make actual API call for delete
      console.log('📡 Making API call to delete alert:', id);
      const { alertService } = await import('../api/services/alertService');
      const alertId = typeof id === 'string' ? parseInt(id) : id;
      await alertService.deleteAlert(alertId);
      console.log('✅ Alert deleted successfully via API');

      set((state) => ({
        lastUpdated: new Date().toISOString()
      }));

    } catch (error: any) {
      console.error('❌ Alert deletion failed, rolling back:', error);
      console.error('Error details:', { message: error?.message, response: error?.response, stack: error?.stack });

      // Handle specific backend limitation
      let errorMessage = error?.message || 'Failed to delete alert';
      if (error?.message?.includes('not yet available')) {
        errorMessage = 'Delete functionality is not yet implemented on the backend. This feature will be available in a future update.';
      }

      // Rollback: Add alert back
      set((state) => ({
        alerts: [rollbackAlert, ...state.alerts],
        error: errorMessage
      }));

      throw error;
    }
  },

  // Helper actions
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  // Resolve/respond to alert
  resolveAlert: async (id: string | number) => {
    console.log('✅ Resolving alert optimistically:', id);

    const { alerts } = get();
    const alertToResolve = alerts.find(alert => alert.id === id);

    if (!alertToResolve) {
      throw new Error(`Alert with id ${id} not found`);
    }

    // Store original for rollback
    const rollbackAlert = { ...alertToResolve };

    // Optimistically update status to completed
    const optimisticAlert = { ...alertToResolve, status: 'completed' as const };
    set((state) => ({
      alerts: state.alerts.map(alert =>
        alert.id === id ? optimisticAlert : alert
      ),
      error: null
    }));

    console.log('⚡ Alert resolved optimistically in UI');

    try {
      // Make actual API call for resolve
      console.log('📡 Making API call to resolve alert:', id);
      const { alertService } = await import('../api/services/alertService');
      const alertId = typeof id === 'string' ? String(id) : id;
      const resolvedAlert = await alertService.resolveAlert(alertId);
      console.log('✅ Alert resolved successfully via API:', resolvedAlert.id);

      // Replace optimistic update with real API response
      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === id ? resolvedAlert : alert
        ),
        lastUpdated: new Date().toISOString()
      }));

      console.log('🔄 Optimistic resolve replaced with API response');

    } catch (error: any) {
      console.error('❌ Alert resolve failed, rolling back:', error);
      console.error('Error details:', { message: error?.message, response: error?.response, stack: error?.stack });

      // Rollback: Restore original alert
      set((state) => ({
        alerts: state.alerts.map(alert =>
          alert.id === id ? rollbackAlert : alert
        ),
        error: error?.message || error?.response?.data?.detail || error?.response?.data?.message || 'Failed to resolve alert'
      }));

      throw error;
    }
  },

  // Computed properties
  getRecentAlerts: (limit = 5) => {
    const { alerts } = get();
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },

  getAlertById: (id) => {
    const { alerts } = get();
    return alerts.find(alert => alert.id === id);
  },

  getPendingAlertsCount: () => {
    const { alerts } = get();
    return alerts.filter(alert => alert.status === 'pending').length;
  },

  getResolvedAlertsCount: () => {
    const { alerts } = get();
    return alerts.filter(alert => 
      alert.status === 'completed' || alert.status === 'resolved'
    ).length;
  },
}));

// Debug function to track alert persistence issue
export const debugAlertPersistence = () => {
  const state = useAlertsStore.getState();
  console.log('🔍 ALERT PERSISTENCE DEBUG:');
  console.log(`📊 Total alerts in store: ${state.alerts.length}`);
  console.log(`🕒 Last updated: ${state.lastUpdated || 'never'}`);
  console.log(`⚠️ Is loading: ${state.isLoading}`);
  console.log(`❌ Error: ${state.error || 'none'}`);
  
  if (state.alerts.length > 0) {
    console.log('📋 All alerts in store:');
    state.alerts.forEach((alert, index) => {
      console.log(`   ${index + 1}. ID:${alert.id} Status:${alert.status} Type:${alert.alert_type} Created:${alert.created_at}`);
    });
    
    // Check for duplicates
    const ids = state.alerts.map(a => a.id);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.log('⚠️ DUPLICATE ALERTS DETECTED!');
    }
    
    // Sort by creation time to see newest
    const sortedByCreated = [...state.alerts].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    console.log('🕒 Newest 5 alerts:');
    sortedByCreated.slice(0, 5).forEach((alert, index) => {
      console.log(`   ${index + 1}. ID:${alert.id} Created:${alert.created_at}`);
    });
  } else {
    console.log('📋 No alerts in store');
  }
};
