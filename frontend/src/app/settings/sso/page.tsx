'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  TextField,
  MenuItem,
  Alert,
  Skeleton,
  Chip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { PageHeader } from '@/components/common/KpiCard';
import { api, SsoProviderSummary, UpsertSsoProviderInput } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';

const PROVIDERS = ['google', 'microsoft', 'oidc'];

export default function SsoSettingsPage() {
  const [providers, setProviders] = useState<SsoProviderSummary[]>([]);
  const [form, setForm] = useState<UpsertSsoProviderInput>({
    provider: 'google',
    clientId: '',
    clientSecret: '',
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [list, profile] = await Promise.all([
        api.sso.providers(),
        api.auth.me().catch(() => null),
      ]);
      setProviders(list);
      if (profile?.organization?.slug) setOrgSlug(profile.organization.slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    try {
      await api.sso.upsert(form);
      setForm((f) => ({ ...f, clientSecret: '' }));
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">Manage users permission required.</Alert>
    }>
      <PageHeader title="SSO / OIDC" subtitle="Google, Microsoft, or custom OpenID Connect" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Alert severity="info" sx={{ mb: 2 }}>
        Callback URL: configure your IdP redirect to{' '}
        <code>{process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/sso/callback</code>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Configure provider</Typography>
          <Stack spacing={2}>
            <TextField
              select
              label="Provider"
              size="small"
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
            >
              {PROVIDERS.map((p) => (
                <MenuItem key={p} value={p}>{p}</MenuItem>
              ))}
            </TextField>
            <TextField label="Client ID" size="small" value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} />
            <TextField label="Client secret" size="small" type="password" value={form.clientSecret} onChange={(e) => setForm((f) => ({ ...f, clientSecret: e.target.value }))} />
            {form.provider === 'oidc' && (
              <TextField label="Issuer URL" size="small" value={form.issuer || ''} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))} />
            )}
            <FormControlLabel
              control={<Switch checked={form.enabled !== false} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />}
              label="Enabled"
            />
            <Button variant="contained" onClick={save} disabled={!form.clientId || !form.clientSecret}>
              Save provider
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Active providers</Typography>
          {loading ? <Skeleton height={60} /> : !providers.length ? (
            <Typography color="text.secondary">No SSO providers configured.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {providers.map((p) => (
                <Stack key={p.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip label={p.name} />
                  <Chip label={p.provider} size="small" variant="outlined" />
                  <Chip label={p.enabled ? 'enabled' : 'disabled'} size="small" color={p.enabled ? 'success' : 'default'} />
                  {orgSlug && p.enabled && (
                    <Button
                      size="small"
                      href={api.sso.authorizeUrl(p.id, orgSlug)}
                    >
                      Test login
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
