'use client';

import { Card, CardContent, Typography, Stack, Chip, LinearProgress, Box } from '@mui/material';
import Link from 'next/link';
import type { SimilarTaskResult, RiskAssessment } from '@/lib/api';

export function SimilarTasksPanel({ tasks, loading }: { tasks: SimilarTaskResult[]; loading?: boolean }) {
  if (loading) return <LinearProgress sx={{ my: 2 }} />;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Similar Historical Tasks
        </Typography>
        {!tasks.length ? (
          <Typography variant="body2" color="text.secondary">
            No similar tasks found yet. Completed tasks build project memory over time.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {tasks.map((t) => (
              <Box key={t.taskId} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  {t.taskDisplayId && (
                    <Chip
                      label={t.taskDisplayId}
                      size="small"
                      component={Link}
                      href={`/tasks/${t.taskId}`}
                      clickable
                    />
                  )}
                  <Chip label={`${t.similarity}% match`} size="small" color="primary" variant="outlined" />
                  <Chip
                    label={t.outcome}
                    size="small"
                    color={t.outcome === 'success' ? 'success' : t.outcome === 'failed' ? 'error' : 'default'}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t.requirement.slice(0, 160)}{t.requirement.length > 160 ? '…' : ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export function RiskBreakdownCard({ risk, loading }: { risk: RiskAssessment | null; loading?: boolean }) {
  if (loading) return <LinearProgress sx={{ my: 2 }} />;

  if (!risk) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600}>Risk Assessment</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Risk score is computed after analysis completes.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const levelColor =
    risk.riskLevel === 'critical' || risk.riskLevel === 'high'
      ? 'error'
      : risk.riskLevel === 'medium'
        ? 'warning'
        : 'success';

  const factors = [
    { label: 'LLM risk', value: risk.factors.llmRisk },
    { label: 'File impact', value: risk.factors.impactedFiles },
    { label: 'Dependency depth', value: risk.factors.dependencyDepth },
    { label: 'Security exposure', value: risk.factors.securityExposure },
    { label: 'Similar failures', value: risk.factors.similarTaskFailureRate },
  ];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>Risk Assessment</Typography>
          <Chip label={risk.riskLevel.toUpperCase()} color={levelColor} size="small" />
        </Stack>
        <Typography variant="h4" fontWeight={700} color={`${levelColor}.main`} sx={{ mb: 1 }}>
          {Math.round(risk.overallScore)}/100
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {risk.summary}
        </Typography>
        <Stack spacing={1}>
          {factors.map((f) => (
            <Box key={f.label}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption">{f.label}</Typography>
                <Typography variant="caption" fontWeight={600}>{f.value}</Typography>
              </Stack>
              <LinearProgress variant="determinate" value={Math.min(f.value, 100)} sx={{ height: 6, borderRadius: 1 }} />
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
