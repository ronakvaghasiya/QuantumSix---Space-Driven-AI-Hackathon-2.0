'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Button,
  MenuItem,
  TextField,
  Alert,
  Skeleton,
  Box,
} from '@mui/material';
import { PageHeader } from '@/components/common/KpiCard';
import { api, BillingQuotaSummary, BillingSubscription, ProjectedCost, UsageMetricRow } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';

const METRIC_LABELS: Record<string, string> = {
  projects: 'Projects',
  tasksPerMonth: 'Tasks (month)',
  tokensPerMonth: 'AI Tokens (month)',
  storageMb: 'Storage (MB)',
  users: 'Team members',
  repositories: 'Repositories',
};

const PLANS = ['free', 'starter', 'pro', 'enterprise'];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [quota, setQuota] = useState<BillingQuotaSummary | null>(null);
  const [usage, setUsage] = useState<UsageMetricRow | null>(null);
  const [projected, setProjected] = useState<ProjectedCost | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [upgradePlan, setUpgradePlan] = useState('starter');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upgrading, setUpgrading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [sub, q, u, profile] = await Promise.all([
        api.billing.subscription(),
        api.billing.quota(),
        api.billing.usage(),
        api.auth.me().catch(() => null),
      ]);
      setSubscription(sub);
      setQuota(q);
      setUsage(u);
      setPermissions(profile?.permissions || []);

      if (profile?.permissions?.includes(Permission.MANAGE_BILLING)) {
        const cost = await api.billing.projectedCost();
        setProjected(cost);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await api.billing.upgrade(upgradePlan);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />;

  return (
    <>
      <PageHeader
        title="Billing & Usage"
        subtitle="Subscription plan, quotas, and consumption"
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Current Plan</Typography>
              <Typography variant="h4" fontWeight={700}>
                {subscription?.plan.name || '—'}
              </Typography>
              <Chip label={subscription?.plan.code} size="small" sx={{ mt: 1, mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                ${((subscription?.plan.priceMonthlyCents || 0) / 100).toFixed(2)} / month
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Status: {subscription?.status}
              </Typography>
            </CardContent>
          </Card>

          {projected && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Projected Cost</Typography>
                <Typography variant="h5" fontWeight={700}>
                  ${projected.projectedTotal.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Base ${projected.baseMonthly.toFixed(2)} + overage ${projected.projectedOverage.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Quota Usage</Typography>
              <Stack spacing={2}>
                {quota?.quotas.map((q) => {
                  const label = METRIC_LABELS[q.metric] || q.metric;
                  const unlimited = q.limit < 0;
                  const pct = unlimited ? 0 : Math.min(100, (q.used / q.limit) * 100);
                  return (
                    <Box key={q.metric}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{label}</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {q.used}{unlimited ? '' : ` / ${q.limit}`}
                          {!q.allowed && (
                            <Chip label="limit reached" size="small" color="error" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                      </Stack>
                      {!unlimited && (
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>This Month</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Tokens</Typography>
                  <Typography variant="h6">{Number(usage?.tokensUsed || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">HF Requests</Typography>
                  <Typography variant="h6">{Number(usage?.requestsUsed || 0).toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Tasks</Typography>
                  <Typography variant="h6">{usage?.tasksProcessed || 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">Playwright</Typography>
                  <Typography variant="h6">{usage?.playwrightRuns || 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <PermissionGate permission={Permission.MANAGE_BILLING} permissions={permissions}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Upgrade Plan</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <TextField
                    select
                    label="Plan"
                    value={upgradePlan}
                    onChange={(e) => setUpgradePlan(e.target.value)}
                    sx={{ minWidth: 200 }}
                  >
                    {PLANS.map((p) => (
                      <MenuItem key={p} value={p}>{p}</MenuItem>
                    ))}
                  </TextField>
                  <Button variant="contained" onClick={handleUpgrade} disabled={upgrading}>
                    {upgrading ? 'Upgrading…' : 'Upgrade (stub)'}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Stripe integration planned — upgrades apply immediately in dev.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </PermissionGate>
        </Grid>
      </Grid>
    </>
  );
}
