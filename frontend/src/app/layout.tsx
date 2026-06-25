import type { Metadata } from 'next';
import { Roboto, Poppins } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { BRAND } from '@/lib/brand';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: BRAND.fullTitle,
  description: `${BRAND.description} by ${BRAND.organization}.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${roboto.variable} ${poppins.variable}`;

  return (
    <html lang="en" className={fontVars}>
      <body className={`${fontVars} ${roboto.className}`}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <DashboardLayout>{children}</DashboardLayout>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
