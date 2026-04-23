import { create } from 'zustand';
import { getFamilyId, getFamilyCode, setFamilyId, setFamilyCode, clearFamily } from '@/lib/supabase';

interface FamilyState {
  familyId: string | null;
  familyCode: string | null;
  darkMode: boolean;
  initFromStorage: () => void;
  setFamily: (id: string, code: string) => void;
  logout: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (val: boolean) => void;
}

export const useFamilyStore = create<FamilyState>((set) => ({
  familyId: null,
  familyCode: null,
  darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  initFromStorage: () => {
    const id = getFamilyId();
    const code = getFamilyCode();
    const savedDark = localStorage.getItem('dark_mode');
    const darkMode =
      savedDark !== null
        ? savedDark === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (darkMode) document.documentElement.classList.add('dark');
    set({ familyId: id, familyCode: code, darkMode });
  },
  setFamily: (id, code) => {
    setFamilyId(id);
    setFamilyCode(code);
    set({ familyId: id, familyCode: code });
  },
  logout: () => {
    clearFamily();
    set({ familyId: null, familyCode: null });
  },
  toggleDarkMode: () => {
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem('dark_mode', String(next));
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      return { darkMode: next };
    });
  },
  setDarkMode: (val) => {
    localStorage.setItem('dark_mode', String(val));
    if (val) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ darkMode: val });
  },
}));
