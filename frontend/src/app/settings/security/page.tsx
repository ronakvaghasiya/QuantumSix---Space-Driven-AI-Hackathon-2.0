'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  TextField,
  Alert,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { PageHeader } from '@/components/common/KpiCard';
import { api, UserSession, IpAllowlistRule, RepositoryAccessLogEntry } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { formatDate } from '@/lib/utils';
import { authHeaders } from '@/lib/auth';

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [ipRules, setIpRules] = useState<IpAllowlistRule[]>([]);
  const [accessLogs, setAccessLogs] = useState<RepositoryAccessLogEntry[]>([]);
  const [cidr, setCidr] = useState('');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ipError, setIpError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, ip, logs] = await Promise.all([
        api.sessions.list(),
        api.security.ipAllowlist().catch(() => []),
        api.security.accessLogs().catch(() => []),
      ]);
      setSessions(s);
      setIpRules(ip);
      setAccessLogs(logs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const exportAudit = async () => {
    const res = await fetch(api.audit.exportCsvUrl(90), { headers: authHeaders() });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">Manage users permission required.</Alert>
    }>
      <PageHeader title="Security" subtitle="Sessions, IP restrictions, and audit export" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Active sessions</Typography>
              <Button size="small" onClick={() => api.sessions.revokeOthers().then(load)}>
                Revoke other sessions
              </Button>
            </Stack>
            {loading ? <Skeleton height={80} /> : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IP</TableCell>
                    <TableCell>User agent</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.ipAddress || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.userAgent || '—'}
                      </TableCell>
                      <TableCell>{formatDate(s.expiresAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => api.sessions.revoke(s.id).then(load)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>IP allowlist</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add rules on any plan. Enforcement is active only on the Enterprise plan when at least one rule exists.
            </Typography>
            {ipError && <Alert severity="error" sx={{ mb: 2 }}>{ipError}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField label="CIDR" size="small" value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="203.0.113.0/24" />
              <TextField label="Label" size="small" value={label} onChange={(e) => setLabel(e.target.value)} />
              <Button
                variant="contained"
                disabled={!cidr.trim()}
                onClick={async () => {
                  setIpError('');
                  try {
                    await api.security.addIp(cidr, label);
                    setCidr('');
                    setLabel('');
                    load();
                  } catch (e) {
                    setIpError((e as Error).message);
                  }
                }}
              >
                Add rule
              </Button>
            </Stack>
            {ipRules.map((r) => (
              <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" fontFamily="monospace">{r.cidr}</Typography>
                {r.label && <Typography variant="caption" color="text.secondary">{r.label}</Typography>}
                <IconButton size="small" onClick={() => api.security.removeIp(r.id).then(load)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Audit export</Typography>
              <Button startIcon={<DownloadIcon />} variant="outlined" onClick={exportAudit}>
                Download CSV (90 days)
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Includes task audit events scoped to your organization.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Repository access log</Typography>
            {!accessLogs.length ? (
              <Typography color="text.secondary">No access events logged yet.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Action</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {accessLogs.slice(0, 30).map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.action}</TableCell>
                      <TableCell>{l.actorId || '—'}</TableCell>
                      <TableCell>{l.ipAddress || '—'}</TableCell>
                      <TableCell>{formatDate(l.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Stack>
    </PermissionGate>
  );
}
