'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TextField, Button, Alert, Stack } from '@mui/material';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.login({ email, password });
      saveSession({
        accessToken: res.accessToken,
        user: res.user,
        permissions: res.permissions,
      });
      router.push('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your organization workspace">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Stack>
      </form>
      <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
        <Link href="/register" style={{ fontSize: '0.875rem', color: '#00A76F', fontWeight: 600 }}>
          Create an account
        </Link>
      </Stack>
    </AuthLayout>
  );
}
