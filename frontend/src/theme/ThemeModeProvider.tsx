import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

type Mode = 'light' | 'dark';
type ThemeCtx = { mode: Mode; toggle: () => void };

const ThemeModeContext = createContext<ThemeCtx | undefined>(undefined);

const YELLOW = '#ffbb00'; // site accent
const DARK_BG = '#141414';
const DARK_PAPER = '#1d1d1d';

function buildTheme(mode: Mode) {
  const isDark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: YELLOW, contrastText: isDark ? DARK_BG : '#141414' },
      background: { default: isDark ? DARK_BG : '#ffffff', paper: isDark ? DARK_PAPER : '#ffffff' },
      text: { primary: isDark ? '#ffffff' : '#141414', secondary: isDark ? '#d0d0d0' : '#555555' },
    },
    typography: {
      fontFamily: 'Raleway, Play, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      h6: { fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: { background: isDark ? DARK_PAPER : '#ffffff', color: isDark ? '#ffffff' : '#141414', borderBottom: isDark ? '1px solid #434343' : '1px solid #e6e6e6' },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { background: isDark ? DARK_PAPER : '#fafafa' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { '&.Mui-selected': { background: isDark ? 'rgba(255,187,0,0.12)' : 'rgba(255,187,0,0.16)' } },
        },
      },
      MuiButton: {
        styleOverrides: { containedPrimary: { color: '#141414' } },
      },
    },
  });
}

export function ThemeModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('admin.theme') as Mode) || 'dark');
  useEffect(() => { localStorage.setItem('admin.theme', mode); }, [mode]);
  const toggle = () => setMode((m) => (m === 'dark' ? 'light' : 'dark'));
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, toggle }), [mode]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}




