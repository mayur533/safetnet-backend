import {create} from 'zustand';

interface SettingsState {
  shakeToSendSOS: boolean;
  setShakeToSendSOS: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  shakeToSendSOS: false,
  setShakeToSendSOS: (enabled: boolean) => {
    set({shakeToSendSOS: enabled});
  },
}));

