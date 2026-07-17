import { useEffect, useState } from 'react';

const KEY = 'mh-theme';

const systemPrefersDark = () => {
  try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch { return false; }
};

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) return stored;
      // No saved preference yet — this is a 10:30PM-7AM shift app, so default
      // to the system's dark-mode preference rather than always starting light.
      return systemPrefersDark() ? 'dark' : 'light';
    } catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggle, isDark: theme === 'dark' };
}
