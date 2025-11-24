import {apiService, SubscriptionRequest, SubscriptionResponse} from './apiService';

export type BillingPlan = 'free' | 'premium-monthly' | 'premium-annual';

export interface BillingProduct {
  id: BillingPlan;
  title: string;
  subtitle: string;
  price: string;
  badge?: string;
  savings?: string;
}

const PRODUCTS: BillingProduct[] = [
  {
    id: 'premium-monthly',
    title: 'Premium Monthly',
    subtitle: 'All advanced safety features, billed monthly.',
    price: '₹499 / month',
    badge: 'Most popular',
  },
  {
    id: 'premium-annual',
    title: 'Premium Annual',
    subtitle: 'Save 20% with yearly billing.',
    price: '₹4,799 / year',
    savings: 'Save ₹1,189/year',
  },
];

export const listBillingProducts = (): BillingProduct[] => PRODUCTS;

export const requestPurchase = async (
  productId: BillingPlan,
  promoCode?: string,
): Promise<{success: boolean; plan: 'free' | 'premium'; productId?: BillingPlan; message?: string}> => {
  if (productId === 'free') {
    return {success: true, plan: 'free' as const};
  }

  try {
    const subscriptionRequest: SubscriptionRequest = {
      plan_type: productId,
      ...(promoCode && {promo_code: promoCode}),
    };

    const response = await apiService.subscribe(subscriptionRequest);

    if (response.error) {
      return {
        success: false,
        plan: 'free',
        message: response.error,
      };
    }

    if (response.data) {
      return {
        success: response.data.success,
        plan: response.data.plan_type,
        productId,
        message: response.data.message,
      };
    }

    return {success: false, plan: 'free', message: 'Unknown error occurred'};
  } catch (error: any) {
    console.error('Purchase request failed:', error);
    return {
      success: false,
      plan: 'free',
      message: error.message || 'Failed to process purchase',
    };
  }
};

export const restorePurchases = async (): Promise<{success: boolean; message?: string}> => {
  try {
    // Check if user has active subscription by fetching profile
    const profileResponse = await apiService.getProfile();
    
    if (profileResponse.error) {
      return {success: false, message: profileResponse.error};
    }

    if (profileResponse.data?.plantype === 'premium') {
      // Check if subscription is still valid
      if (profileResponse.data.planexpiry) {
        const expiryDate = new Date(profileResponse.data.planexpiry);
        const now = new Date();
        if (expiryDate > now) {
          return {success: true, message: 'Premium subscription restored'};
        }
      }
    }

    return {success: false, message: 'No active purchases found'};
  } catch (error: any) {
    console.error('Restore purchases failed:', error);
    return {success: false, message: error.message || 'Failed to restore purchases'};
  }
};


