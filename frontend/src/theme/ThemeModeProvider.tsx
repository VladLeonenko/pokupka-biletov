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
      primary: { main: YELLOW, contrastText: '#141414' },
      background: { default: isDark ? DARK_BG : '#ffffff', paper: isDark ? DARK_PAPER : '#ffffff' },
      text: { primary: isDark ? '#ffffff' : '#141414', secondary: isDark ? '#d0d0d0' : '#555555' },
    },
    typography: {
      fontFamily: '"Raleway", "Play", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 },
      h2: { fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 },
      h3: { fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1.2 },
      h4: { fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.25 },
      h5: { fontWeight: 600, letterSpacing: '-0.005em', lineHeight: 1.3 },
      h6: { fontWeight: 600, lineHeight: 1.35 },
      body1: { lineHeight: 1.65, letterSpacing: '0.01em' },
      body2: { lineHeight: 1.6, letterSpacing: '0.01em' },
      button: { fontWeight: 600, letterSpacing: '0.02em' },
      overline: { fontWeight: 500, letterSpacing: '0.25em', fontSize: '0.75rem' },
      caption: { lineHeight: 1.5 },
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
        styleOverrides: {
          containedPrimary: {
            color: '#141414 !important',
            '&:hover': { color: '#141414 !important' },
          },
          root: {
            '&.MuiButton-contained': { color: '#141414' },
            '&.MuiButton-contained:hover': { color: '#141414' },
          },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': {
            boxSizing: 'border-box',
          },
          html: {
            scrollBehavior: 'smooth',
          },
          body: {
            fontFamily: '"Raleway", "Play", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
          },
          'h1, h2, h3, h4, h5, h6': {
            fontFamily: '"Raleway", "Play", sans-serif',
          },
          'p, span, a, li, td, th, label, input, textarea, select, button': {
            fontFamily: 'inherit',
          },
          /* Текст в жёлтых кнопках (и <button>, и <a>) — #141414 */
          'a.btn, a.submit-order, .btn.submit-order, .btn-mode a.btn, .btn-mode a.submit-order': {
            color: '#141414 !important',
          },
          'a.btn:hover, a.submit-order:hover': {
            color: '#141414 !important',
          },
        },
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




