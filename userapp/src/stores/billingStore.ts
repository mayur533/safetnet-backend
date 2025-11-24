import {create} from 'zustand';
import {requestPurchase, restorePurchases, BillingPlan} from '../services/billingService';
import {useAuthStore} from './authStore';
import {apiService} from '../services/apiService';

interface BillingState {
  isProcessing: boolean;
  lastError?: string;
  upgrade: (plan: BillingPlan, promoCode?: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  clearError: () => void;
}

export const useBillingStore = create<BillingState>((set) => ({
  isProcessing: false,
  lastError: undefined,
  upgrade: async (plan, promoCode) => {
    set({isProcessing: true, lastError: undefined});
    try {
      const result = await requestPurchase(plan, promoCode);
      if (result.success && result.plan === 'premium') {
        // Fetch updated profile from API to get plan expiry
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data) {
          await useAuthStore.getState().setPlan('premium');
          // Refresh profile to get latest plan info
          await useAuthStore.getState().refreshProfile();
        } else {
          await useAuthStore.getState().setPlan('premium');
        }
        set({isProcessing: false, lastError: undefined});
        return true;
      }
      set({isProcessing: false, lastError: result.message || 'Purchase failed'});
      return false;
    } catch (error) {
      const errorMessage = (error as Error)?.message ?? 'Purchase failed';
      set({isProcessing: false, lastError: errorMessage});
      return false;
    }
  },
  restore: async () => {
    set({isProcessing: true, lastError: undefined});
    try {
      const result = await restorePurchases();
      if (result.success) {
        // Fetch updated profile from API
        const profileResponse = await apiService.getProfile();
        if (profileResponse.data && profileResponse.data.plantype === 'premium') {
          await useAuthStore.getState().setPlan('premium');
          // Refresh profile to get latest plan info
          await useAuthStore.getState().refreshProfile();
        }
        set({isProcessing: false, lastError: undefined});
        return true;
      }
      set({isProcessing: false, lastError: result.message || 'No active purchases found'});
      return false;
    } catch (error) {
      const errorMessage = (error as Error)?.message ?? 'Restore failed';
      set({isProcessing: false, lastError: errorMessage});
      return false;
    }
  },
  clearError: () => {
    set({lastError: undefined});
  },
}));

