export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'lexiloom_theme_mode_v1';

export function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function loadThemePreference(): ThemePreference {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch {
    // Ignore storage errors
  }
  return 'system';
}

export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore storage quota errors
  }
}

export function resolveThemeIsDark(preference: ThemePreference): boolean {
  if (preference === 'dark') return true;
  if (preference === 'light') return false;
  return getSystemPrefersDark();
}

export function applyThemeToDocument(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0D131A' : '#176B52');
  }
}
