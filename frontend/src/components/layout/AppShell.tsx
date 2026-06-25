'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const AUTH_PATHS = new Set(['/login', '/register']);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_PATHS.has(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isAuthPage) router.replace('/login');
    if (user && isAuthPage) router.replace('/');
  }, [user, loading, isAuthPage, router]);

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthPage) return <>{children}</>;
  if (!user) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
