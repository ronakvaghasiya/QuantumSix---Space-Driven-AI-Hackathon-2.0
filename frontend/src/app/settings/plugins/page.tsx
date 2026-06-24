'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Alert,
  Skeleton,
  Chip,
  Switch,
  FormControlLabel,
  Grid,
  Box,
} from '@mui/material';
import ExtensionIcon from '@mui/icons-material/Extension';
import { PageHeader } from '@/components/common/KpiCard';
import { api, PluginCatalogItem, PluginInstallation } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function PluginsSettingsPage() {
  const [catalog, setCatalog] = useState<PluginCatalogItem[]>([]);
  const [installed, setInstalled] = useState<PluginInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cat, inst] = await Promise.all([api.plugins.catalog(), api.plugins.installed()]);
      setCatalog(cat);
      setInstalled(inst);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isInstalled = (pluginId: string) => installed.find((i) => i.pluginId === pluginId);

  const install = async (plugin: PluginCatalogItem) => {
    const defaultConfig =
      plugin.slug === 'risk-gate-validator'
        ? { riskThreshold: 75 }
        : plugin.slug === 'coverage-validator'
          ? { minCoverage: 50 }
          : {};
    await api.plugins.install(plugin.id, defaultConfig);
    await load();
  };

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">Manage users permission required.</Alert>
    }>
      <PageHeader title="Plugin Marketplace" subtitle="Install validators and workflow nodes for your organization" />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
      ) : (
        <Grid container spacing={2}>
          {catalog.map((plugin) => {
            const inst = isInstalled(plugin.id);
            return (
              <Grid item xs={12} md={6} key={plugin.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <ExtensionIcon color="primary" fontSize="small" />
                      <Typography variant="subtitle1" fontWeight={600}>{plugin.name}</Typography>
                      <Chip label={plugin.type} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                      {plugin.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Hooks: {((plugin.manifest?.hooks as string[]) || []).join(', ') || 'none'}
                    </Typography>
                    {inst ? (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={inst.enabled}
                              onChange={(e) =>
                                api.plugins.setEnabled(plugin.id, e.target.checked).then(load)
                              }
                              size="small"
                            />
                          }
                          label={inst.enabled ? 'Enabled' : 'Disabled'}
                        />
                        <Button size="small" color="error" onClick={() => api.plugins.uninstall(plugin.id).then(load)}>
                          Uninstall
                        </Button>
                      </Stack>
                    ) : (
                      <Button size="small" variant="contained" onClick={() => install(plugin)}>
                        Install
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {installed.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {installed.length} plugin(s) installed — hooks run during pipeline execution.
          </Typography>
        </Box>
      )}
    </PermissionGate>
  );
}
