'use client';

import { Suspense } from 'react';
import { Skeleton } from '@mui/material';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton variant="rectangular" height={360} sx={{ maxWidth: 420, mx: 'auto', mt: 8, borderRadius: 2 }} />}>
      <LoginForm />
    </Suspense>
  );
}
