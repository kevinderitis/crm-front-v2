import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },
  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { user, token } = await api.login(email, password);
      api.setToken(token);
      localStorage.setItem('token', token);
      set({ user });
      localStorage.setItem('user', JSON.stringify(user));
    } finally {
      set({ loading: false });
    }
  },
  signOut: async () => {
    set({ loading: true });
    try {
      await api.logout();
      set({ user: null });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      set({ loading: false });
    }
  },
  initAuth: () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      api.setToken(token);
      set({ user: JSON.parse(savedUser), initialized: true });
      api.connectWebSocket();
    } else {
      set({ initialized: true });
    }
  }
}));