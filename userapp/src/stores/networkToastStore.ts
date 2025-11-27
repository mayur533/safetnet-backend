import {create} from 'zustand';

interface NetworkToastState {
  isVisible: boolean;
  isDismissed: boolean;
  show: () => void;
  hide: () => void;
  dismiss: () => void;
  reset: () => void;
}

export const useNetworkToastStore = create<NetworkToastState>((set) => ({
  isVisible: false,
  isDismissed: false,
  show: () => set({isVisible: true, isDismissed: false}),
  hide: () => set({isVisible: false}),
  dismiss: () => set({isVisible: false, isDismissed: true}),
  reset: () => set({isVisible: false, isDismissed: false}),
}));

