import {create} from 'zustand';

type UpgradeModalConfig = {
  title?: string;
  message?: string;
  bullets?: string[];
  ctaLabel?: string;
  onUpgrade?: () => void;
};

interface UpgradeModalState {
  visible: boolean;
  title: string;
  message: string;
  bullets: string[];
  ctaLabel: string;
  onUpgrade?: () => void;
  open: (config?: UpgradeModalConfig) => void;
  close: () => void;
}

const defaultBullets = [
  'Unlimited emergency contacts & trusted circles',
  'Live geofence monitoring with officer routing',
  'Priority access to verified responders',
];

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  visible: false,
  title: 'Upgrade to Premium',
  message: 'Unlock Pro safety automations, live geofence control, and priority support.',
  bullets: defaultBullets,
  ctaLabel: 'Upgrade Now',
  onUpgrade: undefined,
  open: (config) =>
    set({
      visible: true,
      title: config?.title ?? 'Premium Feature',
      message:
        config?.message ??
        'Premium members unlock powerful automations, verified responder routing, and priority monitoring.',
      bullets: config?.bullets && config.bullets.length > 0 ? config.bullets : defaultBullets,
      ctaLabel: config?.ctaLabel ?? 'Upgrade Now',
      onUpgrade: config?.onUpgrade,
    }),
  close: () => set({visible: false}),
}));

