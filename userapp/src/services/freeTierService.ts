/**
 * Free Tier Limit Tracking Service
 * Tracks usage and triggers upgrade prompts when free tier limits are reached
 */

import {useAuthStore} from '../stores/authStore';
import {useContactStore} from '../stores/contactStore';

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_CONTACTS: 3,
} as const;

export interface FreeTierCheck {
  limitReached: boolean;
  limitType: 'contacts' | null;
  message: string;
  currentUsage: number;
  limit: number;
}

/**
 * Check if user has reached free tier contact limit
 */
export const checkContactLimit = (): FreeTierCheck => {
  const isPremium = useAuthStore.getState().user?.plan === 'premium';
  if (isPremium) {
    return {
      limitReached: false,
      limitType: null,
      message: '',
      currentUsage: 0,
      limit: Infinity,
    };
  }

  const contacts = useContactStore.getState().contacts;
  const contactCount = contacts.filter((c) => c.phone).length;
  const limitReached = contactCount >= FREE_TIER_LIMITS.MAX_CONTACTS;

  return {
    limitReached,
    limitType: 'contacts',
    message: `Free plan allows up to ${FREE_TIER_LIMITS.MAX_CONTACTS} emergency contacts. Upgrade to Premium for unlimited contacts.`,
    currentUsage: contactCount,
    limit: FREE_TIER_LIMITS.MAX_CONTACTS,
  };
};


/**
 * Get upgrade prompt message based on limit type
 */
export const getUpgradePrompt = (limitType: FreeTierCheck['limitType']): string => {
  switch (limitType) {
    case 'contacts':
      return 'You have reached the free tier contact limit. Upgrade to Premium for unlimited emergency contacts.';
    default:
      return 'Upgrade to Premium to unlock all features.';
  }
};

export interface LimitCheckResult {
  limitType: 'contacts';
  message: string;
  currentUsage: number;
  limit: number;
}

/**
 * Check all free tier limits and return results
 */
export const checkAllLimits = (): LimitCheckResult[] => {
  const isPremium = useAuthStore.getState().user?.plan === 'premium';
  if (isPremium) {
    return [];
  }

  const results: LimitCheckResult[] = [];

  // Check contacts limit
  const contactCheck = checkContactLimit();
  if (contactCheck.limitReached && contactCheck.limitType) {
    results.push({
      limitType: contactCheck.limitType,
      message: contactCheck.message,
      currentUsage: contactCheck.currentUsage,
      limit: contactCheck.limit,
    });
  }

  return results;
};
