'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue with your QuantumSix workspace."
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Email"
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
        <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          New to the team?{' '}
          <Link href="/register" style={{ color: '#00A76F', fontWeight: 600 }}>
            Create account
          </Link>
        </Typography>
      </Stack>
    </AuthShell>
  );
}
