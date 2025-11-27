import {useCallback} from 'react';
import {useAuthStore} from '../../stores/authStore';
import {useUpgradeModalStore} from '../../stores/upgradeModalStore';

export type SubscriptionPlan = 'free' | 'premium';

export const FREE_CONTACT_LIMIT = 5;
export const FREE_TRUSTED_CIRCLE_LIMIT = 2;

export type UpgradePromptOptions = {
  title?: string;
  bullets?: string[];
  ctaLabel?: string;
  onUpgrade?: () => void;
};

export const useSubscription = () => {
  const plan = useAuthStore((state) => state.user?.plan as SubscriptionPlan | undefined);
  const normalizedPlan: SubscriptionPlan = plan ?? 'free';
  const isPremium = normalizedPlan === 'premium';
  const openUpgradeModal = useUpgradeModalStore((state) => state.open);

  const promptUpgrade = useCallback(
    (message?: string, options?: UpgradePromptOptions) => {
      openUpgradeModal({
        message,
        title: options?.title,
        bullets: options?.bullets,
        ctaLabel: options?.ctaLabel,
        onUpgrade: options?.onUpgrade,
      });
    },
    [openUpgradeModal],
  );

  const requirePremium = useCallback(
    (message?: string, options?: UpgradePromptOptions) => {
      if (!isPremium) {
        promptUpgrade(
          message ??
            'This feature belongs to the Premium plan. Upgrade to unlock live monitoring and advanced automations.',
          options,
        );
        return false;
      }
      return true;
    },
    [isPremium, promptUpgrade],
  );

  return {
    plan: normalizedPlan,
    isPremium,
    requirePremium,
    promptUpgrade,
  };
};
