import { create } from 'zustand';

export const useAppStore = create((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  token: null,
  user: null,
  role: null,
  setAuth: (payload) => set(() => ({
    token: payload?.token || null,
    user: payload?.user || null,
    role: (payload?.user?.role || payload?.role || '').toString().toUpperCase() || null,
  })),
  clearAuth: () => set(() => ({ token: null, user: null, role: null })),
}));


