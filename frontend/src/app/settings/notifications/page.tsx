'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  Button,
  TextField,
  MenuItem,
  Alert,
  Skeleton,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@/components/common/KpiCard';
import {
  api,
  CreateNotificationChannelInput,
  NotificationChannel,
  NotificationDelivery,
} from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { formatDate } from '@/lib/utils';

const CHANNEL_TYPES = ['email', 'slack', 'teams'] as const;

const EVENT_OPTIONS = [
  { value: 'analysis_ready', label: 'Analysis ready' },
  { value: 'code_ready', label: 'Code ready' },
  { value: 'validation_failed', label: 'Validation failed' },
  { value: 'security_scan_failed', label: 'Security scan failed' },
  { value: 'pr_created', label: 'PR created' },
  { value: 'mr_ready', label: 'MR ready' },
  { value: 'task_completed', label: 'Task completed' },
];

const emptyForm = (): CreateNotificationChannelInput => ({
  type: 'slack',
  name: '',
  config: { webhookUrl: '' },
  enabled: true,
  events: [],
});

export default function NotificationsSettingsPage() {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [form, setForm] = useState<CreateNotificationChannelInput>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ch, del] = await Promise.all([
        api.notifications.channels(),
        api.notifications.deliveries(),
      ]);
      setChannels(ch);
      setDeliveries(del);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onTypeChange = (type: typeof CHANNEL_TYPES[number]) => {
    const config =
      type === 'email'
        ? { recipients: [''] }
        : { webhookUrl: '' };
    setForm((f) => ({ ...f, type, config }));
  };

  const createChannel = async () => {
    setSaving(true);
    setError('');
    try {
      const config = { ...form.config };
      if (form.type === 'email') {
        const raw = String(config.recipients || '');
        config.recipients = raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
      await api.notifications.createChannel({ ...form, config });
      setForm(emptyForm());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (ch: NotificationChannel) => {
    await api.notifications.updateChannel(ch.id, { enabled: !ch.enabled });
    await load();
  };

  const removeChannel = async (id: string) => {
    await api.notifications.deleteChannel(id);
    await load();
  };

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">You need manage users permission to configure notifications.</Alert>
    }>
      <PageHeader title="Notification Channels" subtitle="Email, Slack, and Teams alerts for pipeline events" />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Add channel</Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Type"
                  value={form.type}
                  onChange={(e) => onTypeChange(e.target.value as typeof CHANNEL_TYPES[number])}
                  fullWidth
                >
                  {CHANNEL_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  fullWidth
                />
                {form.type === 'email' ? (
                  <TextField
                    label="Recipients (comma-separated)"
                    value={(form.config.recipients as string[])?.join(', ') || ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        config: { recipients: e.target.value.split(',').map((s) => s.trim()) },
                      }))
                    }
                    fullWidth
                    helperText="Uses RESEND_API_KEY when set; otherwise logs to server"
                  />
                ) : (
                  <TextField
                    label="Webhook URL"
                    value={String(form.config.webhookUrl || '')}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, config: { webhookUrl: e.target.value } }))
                    }
                    fullWidth
                  />
                )}
                <TextField
                  select
                  label="Events (empty = all)"
                  value=""
                  onChange={(e) => {
                    const ev = e.target.value;
                    if (ev && !form.events?.includes(ev)) {
                      setForm((f) => ({ ...f, events: [...(f.events || []), ev] }));
                    }
                  }}
                  fullWidth
                >
                  {EVENT_OPTIONS.filter((o) => !form.events?.includes(o.value)).map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </TextField>
                {form.events && form.events.length > 0 && (
                  <Box>
                    {form.events.map((ev) => (
                      <Chip
                        key={ev}
                        label={ev}
                        size="small"
                        onDelete={() =>
                          setForm((f) => ({
                            ...f,
                            events: f.events?.filter((x) => x !== ev),
                          }))
                        }
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={createChannel}
                  disabled={saving || !form.name.trim()}
                >
                  Add channel
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active channels</Typography>
              {loading ? (
                <Skeleton height={120} />
              ) : !channels.length ? (
                <Typography color="text.secondary">
                  No channels yet. Add Slack/Teams webhooks or email recipients, or set env vars
                  (SLACK_WEBHOOK_URL, TEAMS_WEBHOOK_URL, NOTIFICATION_EMAIL_TO).
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {channels.map((ch) => (
                    <Box
                      key={ch.id}
                      sx={{
                        p: 1.5,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{ch.name}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                          <Chip label={ch.type} size="small" />
                          <Chip
                            label={ch.enabled ? 'enabled' : 'disabled'}
                            size="small"
                            color={ch.enabled ? 'success' : 'default'}
                          />
                        </Stack>
                      </Box>
                      <Stack direction="row" alignItems="center">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={ch.enabled}
                              onChange={() => toggleChannel(ch)}
                              size="small"
                            />
                          }
                          label=""
                        />
                        <IconButton size="small" color="error" onClick={() => removeChannel(ch.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent deliveries</Typography>
              {loading ? (
                <Skeleton height={160} />
              ) : !deliveries.length ? (
                <Typography color="text.secondary">No deliveries logged yet.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Event</TableCell>
                      <TableCell>Channel</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>When</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deliveries.slice(0, 20).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.eventType}</TableCell>
                        <TableCell>{d.channelType}</TableCell>
                        <TableCell>
                          <Chip label={d.status} size="small" />
                        </TableCell>
                        <TableCell>{formatDate(d.sentAt || d.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PermissionGate>
  );
}
