'use client';

import { createTheme, alpha } from '@mui/material/styles';

export const fontRoboto = 'var(--font-roboto), "Roboto", "Helvetica", "Arial", sans-serif';
export const fontPoppins = 'var(--font-poppins), "Poppins", "Roboto", sans-serif';

const roboto = fontRoboto;
const poppins = fontPoppins;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00A76F', light: '#5BE49B', dark: '#007867', contrastText: '#fff' },
    secondary: { main: '#8E33FF', light: '#C684FF', dark: '#5119B7' },
    info: { main: '#00B8D9' },
    success: { main: '#22C55E' },
    warning: { main: '#FFAB00' },
    error: { main: '#FF5630' },
    grey: {
      50: '#FCFDFD',
      100: '#F9FAFB',
      200: '#F4F6F8',
      300: '#DFE3E8',
      400: '#C4CDD5',
      500: '#919EAB',
      600: '#637381',
      700: '#454F5B',
      800: '#1C252E',
      900: '#141A21',
    },
    background: { default: '#F4F6F8', paper: '#FFFFFF' },
    text: { primary: '#1C252E', secondary: '#637381' },
    divider: 'rgba(145, 158, 171, 0.2)',
  },
  typography: {
    fontFamily: roboto,
    h1: { fontFamily: poppins, fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontFamily: poppins, fontWeight: 700, fontSize: '2rem' },
    h3: { fontFamily: poppins, fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontFamily: poppins, fontWeight: 600, fontSize: '1.25rem' },
    h5: { fontFamily: poppins, fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontFamily: poppins, fontWeight: 600, fontSize: '1rem' },
    subtitle1: { fontFamily: poppins, fontWeight: 600 },
    subtitle2: { fontFamily: poppins, fontWeight: 600, fontSize: '0.875rem' },
    body1: { fontFamily: roboto, fontSize: '1rem' },
    body2: { fontFamily: roboto, fontSize: '0.875rem' },
    caption: { fontFamily: roboto, fontSize: '0.75rem' },
    button: { fontFamily: poppins, fontWeight: 600, textTransform: 'none' },
    overline: {
      fontFamily: poppins,
      fontSize: '0.6875rem',
      fontWeight: 700,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: '#919EAB',
    },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: poppins,
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&:hover': { boxShadow: '0 8px 16px rgba(0, 167, 111, 0.24)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(145, 158, 171, 0.12)',
          boxShadow: '0 0 2px 0 rgba(145,158,171,0.08), 0 8px 20px -4px rgba(145,158,171,0.1)',
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 600 } },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontFamily: poppins, fontWeight: 500, fontSize: '0.875rem' },
        secondary: { fontFamily: roboto, fontSize: '0.75rem' },
      },
    },
    MuiTab: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 600, textTransform: 'none' } },
    },
    MuiMenuItem: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 500 } },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 600 } },
    },
    MuiAlertTitle: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 600 } },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { fontFamily: roboto },
        input: { fontFamily: roboto },
      },
    },
    MuiFormLabel: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 500 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontFamily: poppins,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#637381',
            backgroundColor: '#F9FAFB',
            borderBottom: '1px solid rgba(145, 158, 171, 0.16)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontFamily: roboto, borderColor: 'rgba(145, 158, 171, 0.12)' },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 10 },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginBottom: 2,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: { fontFamily: roboto },
        body: { fontFamily: roboto, backgroundColor: '#F4F6F8' },
        'h1, h2, h3, h4, h5, h6': { fontFamily: poppins },
      },
    },
  },
});

export default theme;

export function resolveThemeColor(color: string, fallback = theme.palette.primary.main): string {
  const parts = color.split('.');
  if (parts.length === 2) {
    const [key, shade] = parts;
    const palette = theme.palette[key as keyof typeof theme.palette];
    if (palette && typeof palette === 'object' && shade in palette) {
      const value = (palette as { main?: string; light?: string; dark?: string })[shade as 'main' | 'light' | 'dark'];
      if (typeof value === 'string') return value;
    }
  }
  const named: Record<string, string> = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };
  return named[color] || (color.startsWith('#') ? color : fallback);
}

export function colorAlpha(color: string, opacity: number): string {
  return alpha(resolveThemeColor(color), opacity);
}
