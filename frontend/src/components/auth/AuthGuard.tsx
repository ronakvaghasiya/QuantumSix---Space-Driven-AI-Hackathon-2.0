'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { isAuthEnabled, getToken } from '@/lib/auth';
import { api } from '@/lib/api';

const PUBLIC_PATHS = ['/login', '/register'];

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(!isAuthEnabled());

  useEffect(() => {
    if (!isAuthEnabled()) {
      setReady(true);
      return;
    }

    if (PUBLIC_PATHS.includes(pathname)) {
      setReady(true);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }

    api.auth.me()
      .then(() => setReady(true))
      .catch(() => {
        router.replace('/login');
      });
  }, [pathname, router]);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}
