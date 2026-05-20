/**
 * Persistence utility for Wage creation and editing
 * Inspired by HELP/ui/wageSessionStorage.js
 */

const STORAGE_KEYS = {
  CREATE: 'wage_create_persistence',
  EDIT: 'wage_edit_persistence'
};

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistenceData {
  timestamp: number;
  data: any;
}

export const wagePersistence = {
  save(type: 'CREATE' | 'EDIT', data: any) {
    try {
      const payload: PersistenceData = {
        timestamp: Date.now(),
        data
      };
      localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save wage persistence', e);
    }
  },

  load(type: 'CREATE' | 'EDIT') {
    try {
      const item = localStorage.getItem(STORAGE_KEYS[type]);
      if (!item) return null;

      const payload: PersistenceData = JSON.parse(item);
      const now = Date.now();
      
      if (now - payload.timestamp > SESSION_MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEYS[type]);
        return null;
      }

      return payload.data;
    } catch (e) {
      console.error('Failed to load wage persistence', e);
      return null;
    }
  },

  clear(type: 'CREATE' | 'EDIT') {
    localStorage.removeItem(STORAGE_KEYS[type]);
  }
};
