import {create} from 'zustand';

export type ContactType = 'Family' | 'Emergency' | 'Friend';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  type: ContactType;
  relationship?: string;
}

interface ContactStoreState {
  contacts: EmergencyContact[];
  primaryContactId?: string;
  initialized: boolean;
  load: () => Promise<void>;
  addContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<EmergencyContact>;
  updateContact: (contact: EmergencyContact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  setPrimaryContact: (id: string) => Promise<void>;
  reset: () => void;
}

export const useContactStore = create<ContactStoreState>((set, get) => ({
  contacts: [],
  primaryContactId: undefined,
  initialized: false,
  load: async () => {
    if (get().initialized) {
      return;
    }
    set({contacts: [], primaryContactId: undefined, initialized: true});
  },
  addContact: async (contact) => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      ...contact,
    };
    const updated = [newContact, ...get().contacts];
    const primaryContactId = get().primaryContactId ?? newContact.id;
    set({contacts: updated, primaryContactId});
    return newContact;
  },
  updateContact: async (contact) => {
    const updated = get().contacts.map((item) => (item.id === contact.id ? contact : item));
    set({contacts: updated});
  },
  removeContact: async (id) => {
    const filtered = get().contacts.filter((item) => item.id !== id);
    let primaryContactId = get().primaryContactId;
    if (primaryContactId === id) {
      primaryContactId = filtered[0]?.id;
    }
    set({contacts: filtered, primaryContactId});
  },
  setPrimaryContact: async (id) => {
    const exists = get().contacts.some((contact) => contact.id === id);
    if (!exists) {
      return;
    }
    set({primaryContactId: id});
  },
  reset: () => {
    set({contacts: [], primaryContactId: undefined, initialized: false});
  },
}));
// (file rewritten below)

