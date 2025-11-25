import {create} from 'zustand';
import {apiService} from '../services/apiService';
import {useAuthStore} from './authStore';

export type ContactType = 'Family' | 'Emergency' | 'Friend';

export interface EmergencyContact {
  id: number | string;
  name: string;
  phone: string;
  email?: string;
  type: ContactType;
  relationship?: string;
}

interface ContactStoreState {
  contacts: any[];
  primaryContactId?: string;
  initialized: boolean;
  loadContacts: () => Promise<void>;
  addContact: (contact: any) => Promise<void>;
  updateContact: (id: number, contact: any) => Promise<void>;
  deleteContact: (id: number) => Promise<void>;
  setPrimaryContact: (id: string) => Promise<void>;
  reset: () => void;
}

export const useContactStore = create<ContactStoreState>((set, get) => ({
  contacts: [],
  primaryContactId: undefined,
  initialized: false,
  loadContacts: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) {
      set({contacts: [], initialized: true});
      return;
    }
    try {
      const response = await apiService.getFamilyContacts(user.id);
      const contacts = Array.isArray(response) ? response : (response.contacts || []);
      set({contacts, initialized: true});
    } catch (error) {
      console.error('Error loading contacts:', error);
      set({contacts: [], initialized: true});
    }
  },
  addContact: async (contact: any) => {
    const currentContacts = get().contacts;
    set({contacts: [...currentContacts, contact]});
  },
  updateContact: async (id: number, contact: any) => {
    const currentContacts = get().contacts;
    const updated = currentContacts.map((c: any) => 
      (c.id === id ? {...c, ...contact} : c)
    );
    set({contacts: updated});
  },
  deleteContact: async (id: number) => {
    const filtered = get().contacts.filter((c: any) => c.id !== id);
    let primaryContactId = get().primaryContactId;
    if (primaryContactId === id.toString()) {
      primaryContactId = filtered[0]?.id?.toString();
    }
    set({contacts: filtered, primaryContactId});
  },
  setPrimaryContact: async (id: string) => {
    const exists = get().contacts.some((contact: any) => contact.id?.toString() === id);
    if (!exists) {
      return;
    }
    set({primaryContactId: id});
  },
  reset: () => {
    set({contacts: [], primaryContactId: undefined, initialized: false});
  },
}));
