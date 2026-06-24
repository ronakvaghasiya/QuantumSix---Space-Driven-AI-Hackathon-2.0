'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Skeleton,
  TextField,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { PageHeader } from '@/components/common/KpiCard';
import { api, WorkflowConfig } from '@/lib/api';
import { Permission } from '@/lib/permissions';
import { PermissionGate } from '@/components/auth/PermissionGate';

export default function WorkflowSettingsPage() {
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.workflow.get().then(setConfig).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await api.workflow.update({
        approvalGates: config.approvalGates,
        validationRules: config.validationRules,
      });
      setConfig(updated);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />;

  return (
    <PermissionGate permission={Permission.MANAGE_USERS} fallback={
      <Alert severity="warning">Manage users permission required.</Alert>
    }>
      <PageHeader
        title="Workflow Configuration"
        subtitle="Toggle approval gates and validation rules without redeploying"
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mb: 2 }}>Workflow settings saved.</Alert>}

      {config && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Approval gates</Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.approvalGates.analysis}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          approvalGates: { ...config.approvalGates, analysis: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Require analysis approval"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.approvalGates.code}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          approvalGates: { ...config.approvalGates, code: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Require code approval"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.approvalGates.pr}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          approvalGates: { ...config.approvalGates, pr: e.target.checked },
                        })
                      }
                    />
                  }
                  label="Require PR approval"
                />
                <TextField
                  label="Auto-approve analysis when risk score ≤"
                  type="number"
                  size="small"
                  sx={{ maxWidth: 320, mt: 1 }}
                  value={config.approvalGates.riskAutoApproveMaxScore ?? ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      approvalGates: {
                        ...config.approvalGates,
                        riskAutoApproveMaxScore: e.target.value ? Number(e.target.value) : null,
                      },
                    })
                  }
                  helperText="Leave empty to always require analysis approval when gate is on"
                />
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Validation rules</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.validationRules.blockOnLintFail}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        validationRules: { ...config.validationRules, blockOnLintFail: e.target.checked },
                      })
                    }
                  />
                }
                label="Block pipeline on lint failure"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.validationRules.blockOnSecurityScan}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        validationRules: { ...config.validationRules, blockOnSecurityScan: e.target.checked },
                      })
                    }
                  />
                }
                label="Block pipeline on security scan failure"
              />
            </CardContent>
          </Card>

          <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={saving}>
            Save workflow config
          </Button>
        </Stack>
      )}
    </PermissionGate>
  );
}
