'use client';

import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Box,
  Grid,
  Skeleton,
  CircularProgress,
} from '@mui/material';
import Link from 'next/link';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import HistoryIcon from '@mui/icons-material/History';
import type { SimilarTaskResult, RiskAssessment } from '@/lib/api';
import { colorAlpha } from '@/theme';

function factorBarColor(value: number): string {
  if (value >= 60) return 'error.main';
  if (value >= 35) return 'warning.main';
  return 'primary.main';
}

function levelConfig(level: string) {
  if (level === 'critical' || level === 'high') {
    return { color: 'error' as const, bg: 'error.main', label: level === 'critical' ? 'Critical' : 'High' };
  }
  if (level === 'medium') {
    return { color: 'warning' as const, bg: 'warning.main', label: 'Medium' };
  }
  return { color: 'success' as const, bg: 'success.main', label: 'Low' };
}

const RISK_FACTORS = [
  { key: 'llmRisk' as const, label: 'LLM Risk', icon: PsychologyIcon, hint: 'Model uncertainty' },
  { key: 'impactedFiles' as const, label: 'File Impact', icon: FolderCopyOutlinedIcon, hint: 'Files affected' },
  { key: 'dependencyDepth' as const, label: 'Dependency Depth', icon: AccountTreeOutlinedIcon, hint: 'Graph depth' },
  { key: 'securityExposure' as const, label: 'Security Exposure', icon: SecurityOutlinedIcon, hint: 'Security surface' },
  { key: 'similarTaskFailureRate' as const, label: 'Similar Failures', icon: HistoryIcon, hint: 'Past task outcomes' },
];

function RiskFactorRow({ label, hint, value, icon: Icon }: {
  label: string;
  hint: string;
  value: number;
  icon: typeof PsychologyIcon;
}) {
  const barColor = factorBarColor(value);

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'grey.50',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: colorAlpha(barColor, 0.12),
            color: barColor,
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>{label}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{hint}</Typography>
            </Box>
            <Chip
              label={value}
              size="small"
              sx={{
                fontWeight: 700,
                minWidth: 40,
                bgcolor: colorAlpha(barColor, 0.12),
                color: barColor,
                border: 'none',
              }}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(value, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: barColor,
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
}

function RiskCardSkeleton() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Skeleton width={160} height={28} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Skeleton variant="circular" width={120} height={120} sx={{ mx: 'auto' }} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <Stack spacing={1.5}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rounded" height={64} />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

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
  if (loading) return <RiskCardSkeleton />;

  if (!risk) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <ShieldOutlinedIcon color="action" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={600}>Risk Assessment</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Risk score is computed after analysis completes.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const score = Math.round(risk.overallScore);
  const level = levelConfig(risk.riskLevel);
  const primaryFactor = RISK_FACTORS.reduce((top, f) => {
    const val = risk.factors[f.key];
    const topVal = risk.factors[top.key];
    return val > topVal ? f : top;
  }, RISK_FACTORS[0]);

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: colorAlpha('primary.main', 0.12),
                color: 'primary.main',
              }}
            >
              <ShieldOutlinedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Risk Assessment</Typography>
              <Typography variant="caption" color="text.secondary">
                Primary driver: {primaryFactor.label} ({risk.factors[primaryFactor.key]})
              </Typography>
            </Box>
          </Stack>
          <Chip
            label={level.label.toUpperCase()}
            color={level.color === 'success' ? 'primary' : level.color}
            sx={{ fontWeight: 700, px: 0.5 }}
          />
        </Stack>

        <Grid container spacing={3} alignItems="center">
          {/* Score ring */}
          <Grid item xs={12} sm={4} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={score}
                  size={130}
                  thickness={5}
                  sx={{
                    color: level.color === 'success' ? 'primary.main' : level.bg,
                    bgcolor: colorAlpha(level.color === 'success' ? 'primary.main' : level.bg, 0.08),
                    borderRadius: '50%',
                    '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="h3"
                    fontWeight={800}
                    color={level.color === 'success' ? 'primary.main' : `${level.color}.main`}
                    lineHeight={1}
                  >
                    {score}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    / 100
                  </Typography>
                </Box>
              </Box>
              {risk.summary && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2, textAlign: 'center', maxWidth: 200, lineHeight: 1.5 }}
                >
                  {risk.summary}
                </Typography>
              )}
            </Box>
          </Grid>

          {/* Factor breakdown */}
          <Grid item xs={12} sm={8} md={9}>
            <Stack spacing={1.25}>
              {RISK_FACTORS.map((f) => (
                <RiskFactorRow
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  value={risk.factors[f.key]}
                  icon={f.icon}
                />
              ))}
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
