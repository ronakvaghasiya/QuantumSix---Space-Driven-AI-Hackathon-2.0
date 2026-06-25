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

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({ name, email, password });
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Join QuantumSix"
      subtitle="Create your account — works on Windows, Ubuntu, and macOS."
    >
      <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          fullWidth
          autoComplete="name"
        />
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
          helperText="Minimum 8 characters"
          autoComplete="new-password"
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting} fullWidth>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#00A76F', fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Stack>
    </AuthShell>
  );
}
