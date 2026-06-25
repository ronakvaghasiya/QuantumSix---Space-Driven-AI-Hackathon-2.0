'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Divider,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthFormLink } from '@/components/auth/AuthFormLink';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

function GitLabIcon() {
  return (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20 }} aria-hidden>
      <path
        fill="currentColor"
        d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.47l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51 1.22 3.78a.84.84 0 0 1-.3.94z"
      />
    </Box>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [gitlabOAuthReady, setGitlabOAuthReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) setError(decodeURIComponent(oauthError));
  }, [searchParams]);

  useEffect(() => {
    fetch(`${API_BASE}/auth/gitlab/status`)
      .then((r) => (r.ok ? r.json() : { oauthConfigured: false }))
      .then((s: { oauthConfigured?: boolean }) => setGitlabOAuthReady(!!s.oauthConfigured))
      .catch(() => setGitlabOAuthReady(false));
  }, []);

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
    <Stack spacing={2.5}>
      {error && <Alert severity="error" variant="outlined">{error}</Alert>}

      {gitlabOAuthReady && (
        <>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => { window.location.href = `${API_BASE}/auth/gitlab`; }}
            startIcon={<GitLabIcon />}
            sx={{
              py: 1.35,
              bgcolor: '#FC6D26',
              color: '#fff',
              fontWeight: 700,
              boxShadow: `0 8px 20px ${alpha('#FC6D26', 0.35)}`,
              '&:hover': { bgcolor: '#E24329', boxShadow: `0 10px 24px ${alpha('#FC6D26', 0.4)}` },
            }}
          >
            Continue with GitLab
          </Button>
          <Divider>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              or use email
            </Typography>
          </Divider>
        </>
      )}

      <Stack component="form" spacing={2} onSubmit={handleSubmit}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon fontSize="small" color="disabled" />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <LockOutlinedIcon fontSize="small" color="disabled" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          fullWidth
          sx={{ py: 1.35, mt: 0.5 }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" textAlign="center">
        New to the team? <AuthFormLink href="/register">Create account</AuthFormLink>
      </Typography>
    </Stack>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to RepoPilot AI — one prompt to complete feature delivery."
    >
      <Suspense fallback={<Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
