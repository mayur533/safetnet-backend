/**
 * Free Tier Limit Tracking Service
 * Tracks usage and triggers upgrade prompts when free tier limits are reached
 */

import {useAuthStore} from '../stores/authStore';
import {useContactStore} from '../stores/contactStore';
import {useLiveShareStore} from '../stores/liveShareStore';
import {useIncidentStore} from '../stores/incidentStore';

// Free tier limits
export const FREE_TIER_LIMITS = {
  MAX_CONTACTS: 3,
  MAX_LIVE_SHARE_MINUTES: 15,
  MAX_INCIDENT_HISTORY_DAYS: 30,
} as const;

export interface FreeTierCheck {
  limitReached: boolean;
  limitType: 'contacts' | 'liveShare' | 'incidentHistory' | null;
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
 * Check if user has reached free tier live share limit
 */
export const checkLiveShareLimit = (requestedMinutes: number): FreeTierCheck => {
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

  const limitReached = requestedMinutes > FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES;

  return {
    limitReached,
    limitType: 'liveShare',
    message: `Free plan allows up to ${FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES} minutes of live sharing. Upgrade to Premium for unlimited sharing.`,
    currentUsage: requestedMinutes,
    limit: FREE_TIER_LIMITS.MAX_LIVE_SHARE_MINUTES,
  };
};

/**
 * Check if user has reached free tier incident history limit
 */
export const checkIncidentHistoryLimit = (): FreeTierCheck => {
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

  const incidents = useIncidentStore.getState().incidents;
  const thirtyDaysAgo = Date.now() - FREE_TIER_LIMITS.MAX_INCIDENT_HISTORY_DAYS * 24 * 60 * 60 * 1000;
  const recentIncidents = incidents.filter((inc) => inc.timestamp >= thirtyDaysAgo);
  const limitReached = recentIncidents.length >= 50; // Approximate limit

  return {
    limitReached,
    limitType: 'incidentHistory',
    message: `Free plan shows incident history for the last ${FREE_TIER_LIMITS.MAX_INCIDENT_HISTORY_DAYS} days. Upgrade to Premium for unlimited history.`,
    currentUsage: recentIncidents.length,
    limit: 50,
  };
};

/**
 * Get upgrade prompt message based on limit type
 */
export const getUpgradePrompt = (limitType: FreeTierCheck['limitType']): string => {
  switch (limitType) {
    case 'contacts':
      return 'You have reached the free tier contact limit. Upgrade to Premium for unlimited emergency contacts.';
    case 'liveShare':
      return 'You have reached the free tier live sharing limit. Upgrade to Premium for unlimited live location sharing.';
    case 'incidentHistory':
      return 'You have reached the free tier incident history limit. Upgrade to Premium for unlimited history.';
    default:
      return 'Upgrade to Premium to unlock all features.';
  }
};

export interface LimitCheckResult {
  limitType: 'contacts' | 'liveShare' | 'incidentHistory';
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

  // Check incident history limit
  const incidentCheck = checkIncidentHistoryLimit();
  if (incidentCheck.limitReached && incidentCheck.limitType) {
    results.push({
      limitType: incidentCheck.limitType,
      message: incidentCheck.message,
      currentUsage: incidentCheck.currentUsage,
      limit: incidentCheck.limit,
    });
  }

  return results;
};
