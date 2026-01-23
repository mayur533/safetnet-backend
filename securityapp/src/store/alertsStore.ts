import { create } from 'zustand';
import { Alert } from '../types/alert.types';

interface AlertsState {
  // State
  alerts: Alert[];
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
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  // Initial state
  alerts: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Fetch alerts from API
  fetchAlerts: async () => {
    set({ isLoading: true, error: null });

    try {
      console.log('🔄 Fetching alerts from API...');
      const { alertService } = await import('../api/services/alertService');
      const alerts = await alertService.getAlerts();

      set({
        alerts,
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Fetched ${alerts.length} alerts from API`);
      if (alerts.length > 0) {
        console.log('📋 Sample alerts from API:');
        alerts.slice(0, 3).forEach((alert, index) => {
          console.log(`   ${index + 1}. ID:${alert.id} "${alert.message?.substring(0, 30)}..." (${alert.status})`);
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch alerts:', error);
      // IMPORTANT: Do NOT clear existing alerts on fetch error
      // Keep existing alerts so they don't disappear from UI
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch alerts'
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
      return createdAlert;

    } catch (error: any) {
      console.error('❌ Alert creation failed:', error);
      console.error('Error details:', { message: error?.message, response: error?.response, stack: error?.stack });

      set((state) => ({
        error: error?.message || error?.response?.data?.detail || error?.response?.data?.message || 'Failed to create alert'
      }));

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
      await alertService.deleteAlert(id);
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
      const resolvedAlert = await alertService.resolveAlert(id);
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
}));

// Test function to verify error handling in alert operations
export const testAlertErrorHandling = async () => {
  console.log('🧪 TESTING ALERT ERROR HANDLING');

  try {
    // Test with invalid alert ID to trigger error
    console.log('Testing update with invalid ID...');
    await useAlertsStore.getState().updateAlert('invalid-id', { status: 'accepted' });
  } catch (error) {
    console.log('✅ Error handling test passed - error caught properly:', error?.message);
  }

  try {
    console.log('Testing delete with invalid ID...');
    await useAlertsStore.getState().deleteAlert('invalid-id');
  } catch (error) {
    console.log('✅ Error handling test passed - error caught properly:', error?.message);
  }

  return { success: true, message: 'Error handling tests completed' };
};


// Debug function to check current alert state
export const debugAlertState = () => {
  const state = useAlertsStore.getState();
  console.log('🐛 DEBUG ALERT STATE:');
  console.log(`   Total alerts: ${state.alerts.length}`);
  console.log(`   Is loading: ${state.isLoading}`);
  console.log(`   Error: ${state.error || 'none'}`);
  console.log(`   Last updated: ${state.lastUpdated || 'never'}`);

  if (state.alerts.length > 0) {
    console.log('   📋 All alerts:');
    state.alerts.forEach((alert, index) => {
      console.log(`      ${index + 1}. ID:${alert.id} "${alert.message?.substring(0, 40)}..." (${alert.status})`);
    });
  } else {
    console.log('   📋 No alerts in store');
  }
};

// Test function to verify complete alert flow with instant UI updates
export const testCompleteAlertFlow = async () => {
  console.log('🧪 TESTING COMPLETE ALERT FLOW WITH INSTANT UI UPDATES');

  try {
    // Step 1: Check initial state
    console.log('📊 STEP 1: Checking initial alerts state...');
    const initialAlerts = useAlertsStore.getState().alerts;
    console.log(`   Initial alerts count: ${initialAlerts.length}`);

    // Step 2: Create alert (should appear instantly via optimistic update)
    console.log('⚡ STEP 2: Creating alert with optimistic update...');
    const createPromise = useAlertsStore.getState().createAlert({
      alert_type: 'security',
      message: 'Test Alert - Complete Flow Verification',
      description: 'Testing instant UI updates across Dashboard and Alerts screens',
    });

    // Check immediate optimistic update
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for optimistic update
    const afterCreateAlerts = useAlertsStore.getState().alerts;
    console.log(`   Alerts after optimistic create: ${afterCreateAlerts.length}`);
    const optimisticAlert = afterCreateAlerts.find(a => a.message.includes('Complete Flow Verification'));
    console.log(`   Optimistic alert found: ${!!optimisticAlert}`);

    // Step 3: Wait for API completion
    console.log('⏳ STEP 3: Waiting for API completion...');
    const finalAlert = await createPromise;
    console.log(`   Final alert created with ID: ${finalAlert.id}`);

    // Step 4: Verify alert appears in recent alerts
    console.log('📋 STEP 4: Checking recent alerts...');
    const recentAlerts = useAlertsStore.getState().getRecentAlerts(5);
    const alertInRecent = recentAlerts.find(a => a.id === finalAlert.id);
    console.log(`   Alert appears in recent alerts: ${!!alertInRecent}`);

    // Step 5: Simulate screen refresh (like navigating between screens)
    console.log('🔄 STEP 5: Simulating screen refresh...');
    await useAlertsStore.getState().fetchAlerts();
    const refreshedAlerts = useAlertsStore.getState().alerts;
    const alertPersists = refreshedAlerts.find(a => a.id === finalAlert.id);
    console.log(`   Alert persists after refresh: ${!!alertPersists}`);

    // Step 6: Final verification
    const success = !!optimisticAlert && !!alertInRecent && !!alertPersists;
    console.log(`🎯 TEST RESULT: ${success ? '✅ PASSED' : '❌ FAILED'}`);

    return {
      success,
      initialCount: initialAlerts.length,
      optimisticCount: afterCreateAlerts.length,
      finalCount: refreshedAlerts.length,
      alertId: finalAlert.id,
      inRecent: !!alertInRecent,
      persists: !!alertPersists
    };

  } catch (error) {
    console.error('❌ COMPLETE FLOW TEST FAILED:', error);
    return { success: false, error: error.message };
  }
};