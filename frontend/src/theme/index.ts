'use client';

import { createTheme } from '@mui/material/styles';

const roboto = 'var(--font-roboto), "Roboto", "Helvetica", "Arial", sans-serif';
const poppins = 'var(--font-poppins), "Poppins", "Roboto", sans-serif';

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
    background: { default: '#F9FAFB', paper: '#fff' },
    text: { primary: '#1C252E', secondary: '#637381' },
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
    overline: { fontFamily: poppins, fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { fontFamily: poppins, textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 16, boxShadow: '0 0 2px 0 rgba(145,158,171,0.2), 0 12px 24px -4px rgba(145,158,171,0.12)' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontFamily: poppins, fontWeight: 600 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily: roboto },
      },
    },
  },
});

export default theme;
