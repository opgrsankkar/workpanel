import { useEffect, useState } from 'react';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

export function usePrefersDarkMode() {
  const getMatches = () =>
    typeof window !== 'undefined' && window.matchMedia(DARK_MODE_QUERY).matches;

  const [prefersDarkMode, setPrefersDarkMode] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(DARK_MODE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDarkMode(event.matches);
    };

    setPrefersDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDarkMode;
}
