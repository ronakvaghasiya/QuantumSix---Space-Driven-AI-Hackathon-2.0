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
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageHeader } from '@/components/common/KpiCard';
import { api, VaultSecretSummary } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { formatDate } from '@/lib/utils';

const COMMON_KEYS = ['openai_api_key', 'huggingface_api_key', 'gitlab_token', 'resend_api_key'];

export default function VaultSettingsPage() {
  const [secrets, setSecrets] = useState<VaultSecretSummary[]>([]);
  const [keyName, setKeyName] = useState(COMMON_KEYS[0]);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    api.vault.list().then(setSecrets).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    try {
      await api.vault.upsert(keyName, value);
      setValue('');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">Manage users permission required.</Alert>
    }>
      <PageHeader title="Secrets Vault" subtitle="Encrypted organization secrets (requires VAULT_MASTER_KEY on server)" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Add or rotate secret</Typography>
          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }}>
            <TextField
              select
              label="Key name"
              size="small"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              {COMMON_KEYS.map((k) => (
                <MenuItem key={k} value={k}>{k}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Value"
              size="small"
              type="password"
              fullWidth
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Button variant="contained" onClick={save} disabled={!value.trim()}>Save</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Stored secrets</Typography>
          {loading ? <Skeleton height={80} /> : !secrets.length ? (
            <Typography color="text.secondary">No secrets stored yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {secrets.map((s) => (
                <Stack key={s.id} direction="row" spacing={1} alignItems="center">
                  <Chip label={s.keyName} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    v{s.keyVersion} · {formatDate(s.updatedAt)}
                  </Typography>
                  <IconButton size="small" onClick={() => api.vault.delete(s.keyName).then(load)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
