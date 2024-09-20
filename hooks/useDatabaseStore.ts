// useDatabaseStore.ts
import { create } from 'zustand';

interface DatabaseState {
  connectionName: string;
  databaseName: string;
  databaseType: string;
  host: string;
  username: string;
  password: string;
  setConnectionName: (name: string) => void;
  setDatabaseName: (name: string) => void;
  setDatabaseType: (type: string) => void;
  setHost: (host: string) => void;
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  resetForm: () => void;
}

const useDatabaseStore = create<DatabaseState>((set) => ({
  connectionName: '',
  databaseName: '',
  databaseType: '',
  host: '',
  username: '',
  password: '',
  setConnectionName: (name) => set({ connectionName: name }),
  setDatabaseName: (name) => set({ databaseName: name }),
  setDatabaseType: (type) => set({ databaseType: type }),
  setHost: (host) => set({ host: host }),
  setUsername: (username) => set({ username: username }),
  setPassword: (password) => set({ password: password }),
  resetForm: () =>
    set({
      connectionName: '',
      databaseName: '',
      databaseType: '',
      host: '',
      username: '',
      password: '',
    }),
}));

export default useDatabaseStore;
