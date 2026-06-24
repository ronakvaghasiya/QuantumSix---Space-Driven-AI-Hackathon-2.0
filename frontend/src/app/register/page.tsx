'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TextField, Button, Alert, Stack } from '@mui/material';
import { api } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.auth.register({ name, email, password, organizationName });
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
    <AuthLayout title="Create your organization" subtitle="Start using RepoPilot AI for your team">
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <form onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <TextField label="Your name" value={name} onChange={(e) => setName(e.target.value)} required fullWidth />
          <TextField
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText="Minimum 8 characters"
          />
          <TextField
            label="Organization name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </Button>
        </Stack>
      </form>
      <Stack direction="row" justifyContent="center" sx={{ mt: 2.5 }}>
        <Link href="/login" style={{ fontSize: '0.875rem', color: '#00A76F', fontWeight: 600 }}>
          Already have an account? Sign in
        </Link>
      </Stack>
    </AuthLayout>
  );
}
