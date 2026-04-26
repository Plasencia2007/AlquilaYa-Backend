'use client';

import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';

const STORAGE_KEY = 'theme';

interface ThemeState {
  /** Preferencia del usuario (puede ser 'system' = seguir el OS). */
  preference: ThemePreference;
  /** Tema efectivamente aplicado en DOM ('light' | 'dark'). Nunca 'system'. */
  resolved: Theme;
  setPreference: (next: ThemePreference) => void;
  toggle: () => void;
}

function resolveTheme(pref: ThemePreference): Theme {
  if (pref === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
}

function readPreferenceFromStorage(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  resolved: 'light',

  setPreference: (next) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
    const resolved = resolveTheme(next);
    applyTheme(resolved);
    set({ preference: next, resolved });
  },

  toggle: () => {
    const current = get().resolved;
    get().setPreference(current === 'dark' ? 'light' : 'dark');
  },
}));

/** Inicializa el store leyendo de localStorage + media query. Llamar desde ThemeProvider. */
export function initThemeStore() {
  const pref = readPreferenceFromStorage();
  const resolved = resolveTheme(pref);
  applyTheme(resolved);
  useThemeStore.setState({ preference: pref, resolved });

  // Mantener sincronizado el modo 'system' con cambios del OS.
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      const state = useThemeStore.getState();
      if (state.preference === 'system') {
        const next: Theme = e.matches ? 'dark' : 'light';
        applyTheme(next);
        useThemeStore.setState({ resolved: next });
      }
    });
  }
}
