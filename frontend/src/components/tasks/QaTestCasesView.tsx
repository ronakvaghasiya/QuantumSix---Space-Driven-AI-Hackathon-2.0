'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Grid,
  IconButton,
  Stack,
  Typography,
  Alert,
  Button,
  Divider,
  LinearProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ScienceIcon from '@mui/icons-material/Science';
import { QaTestCaseEntry, TestEntry } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type FilterTab = 'all' | 'pass' | 'fail' | 'pending';

function statusIcon(status: string) {
  if (status === 'pass') return <CheckCircleIcon color="success" fontSize="small" />;
  if (status === 'fail') return <ErrorIcon color="error" fontSize="small" />;
  return <HourglassEmptyIcon color="disabled" fontSize="small" />;
}

function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'pass') return 'success';
  if (status === 'fail') return 'error';
  if (status === 'pending') return 'warning';
  return 'default';
}

function priorityColor(priority: string): 'error' | 'warning' | 'info' | 'default' {
  if (priority === 'critical') return 'error';
  if (priority === 'high') return 'warning';
  if (priority === 'medium') return 'info';
  return 'default';
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function QaCaseCard({ tc, defaultOpen }: { tc: QaTestCaseEntry; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? tc.status === 'fail');

  return (
    <Box
      sx={{
        mb: 1.5,
        border: '1px solid',
        borderColor: tc.status === 'fail' ? 'error.light' : 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: tc.status === 'fail' ? 'rgba(255, 86, 48, 0.06)' : 'grey.50',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          {statusIcon(tc.status)}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontFamily="monospace" fontWeight={700}>
                {tc.id}
              </Typography>
              <Chip label={tc.status.toUpperCase()} size="small" color={statusColor(tc.status)} />
              <Chip label={categoryLabel(tc.category)} size="small" variant="outlined" />
              <Chip label={tc.priority} size="small" color={priorityColor(tc.priority)} variant="outlined" />
              {tc.verificationMethod && (
                <Chip
                  icon={<PlayCircleOutlineIcon />}
                  label={tc.verificationMethod}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={600}>{tc.title}</Typography>
            {tc.linkedRequirement && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                Requirement: {tc.linkedRequirement}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setOpen(!open)} aria-label="expand">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, py: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">Preconditions</Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>{tc.preconditions || '—'}</Typography>

              <Typography variant="overline" color="text.secondary">Test Steps</Typography>
              <Box
                component="ol"
                sx={{
                  m: 0,
                  pl: 2.5,
                  mb: 1.5,
                  '& li': { mb: 0.75 },
                }}
              >
                {tc.steps.map((step, i) => (
                  <Typography component="li" variant="body2" key={i}>{step}</Typography>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="overline" color="text.secondary">Expected Result</Typography>
              <Typography variant="body2" sx={{ mb: 1.5 }}>{tc.expectedResult}</Typography>

              {tc.actualResult && (
                <>
                  <Typography variant="overline" color="text.secondary">Actual Result (after run)</Typography>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: tc.status === 'fail' ? 'rgba(255, 86, 48, 0.08)' : 'rgba(34, 197, 94, 0.08)',
                      border: '1px solid',
                      borderColor: tc.status === 'fail' ? 'error.light' : 'success.light',
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color={tc.status === 'fail' ? 'error.main' : 'success.main'}
                    >
                      {tc.actualResult}
                    </Typography>
                  </Box>
                </>
              )}

              {tc.relatedFiles && tc.relatedFiles.length > 0 && (
                <>
                  <Typography variant="overline" color="text.secondary">Related Files</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                    {tc.relatedFiles.map((f) => (
                      <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                    ))}
                  </Stack>
                </>
              )}
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
}

interface QaTestCasesViewProps {
  tests: TestEntry;
  taskStatus?: string;
}

export function QaTestCasesView({ tests, taskStatus }: QaTestCasesViewProps) {
  const cases = tests.qaTestCases || [];
  const [filter, setFilter] = useState<FilterTab>('all');

  const passed = cases.filter((c) => c.status === 'pass').length;
  const failed = cases.filter((c) => c.status === 'fail').length;
  const pending = cases.filter((c) => c.status === 'pending' || c.status === 'skipped').length;
  const verified = Boolean(tests.qaVerifiedAt);
  const passRate = cases.length > 0 ? Math.round((passed / cases.length) * 100) : 0;

  const filtered = useMemo(() => {
    if (filter === 'all') return cases;
    if (filter === 'pass') return cases.filter((c) => c.status === 'pass');
    if (filter === 'fail') return cases.filter((c) => c.status === 'fail');
    return cases.filter((c) => c.status === 'pending' || c.status === 'skipped');
  }, [cases, filter]);

  const filterButtons: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: cases.length },
    { key: 'pass', label: 'Passed', count: passed },
    { key: 'fail', label: 'Failed', count: failed },
    { key: 'pending', label: 'Pending', count: pending },
  ];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <ScienceIcon color="primary" />
        <Box>
          <Typography variant="h6" fontWeight={700}>QA Test Plan</Typography>
          <Typography variant="caption" color="text.secondary">
            Detailed cases generated after code changes — each case is executed during validation
          </Typography>
        </Box>
      </Stack>

      {tests.qaSummary && (
        <Alert severity={failed > 0 ? 'warning' : verified ? 'success' : 'info'} sx={{ mb: 2 }}>
          {tests.qaSummary}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Total Cases</Typography>
              <Typography variant="h5" fontWeight={700}>{cases.length || tests.functionalTests.length}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Passed</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{passed}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Failed</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">{failed}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Pass Rate</Typography>
              <Typography variant="h5" fontWeight={700}>{passRate}%</Typography>
              <LinearProgress
                variant="determinate"
                value={passRate}
                sx={{ mt: 0.75, height: 6, borderRadius: 99 }}
                color={passRate >= 70 ? 'success' : passRate >= 40 ? 'warning' : 'error'}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {tests.qaGeneratedAt && (
              <Chip label={`Generated: ${formatDate(tests.qaGeneratedAt)}`} size="small" variant="outlined" />
            )}
            {tests.qaVerifiedAt && (
              <Chip label={`Executed: ${formatDate(tests.qaVerifiedAt)}`} size="small" color="success" variant="outlined" />
            )}
            {tests.playwrightSpecs.length > 0 && (
              <Chip
                icon={<PlayCircleOutlineIcon />}
                label={`${tests.playwrightSpecs.length} Playwright specs`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip label={`${tests.regressionCoverage}% regression coverage`} size="small" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      {cases.length > 0 ? (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {filterButtons.map((f) => (
              <Button
                key={f.key}
                size="small"
                variant={filter === f.key ? 'contained' : 'outlined'}
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({f.count})
              </Button>
            ))}
          </Stack>

          <Typography variant="subtitle2" gutterBottom>
            Test Cases ({filtered.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Expand each case for steps, expected result, and execution outcome after Playwright/build validation
          </Typography>

          {filtered.map((tc) => (
            <QaCaseCard key={tc.id} tc={tc} />
          ))}
        </>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          {taskStatus === 'generating_code'
            ? 'Detailed QA test cases are being generated after code generation completes...'
            : 'Detailed QA test cases appear here once code generation finishes. Each case will be executed during validation.'}
        </Alert>
      )}

      {(tests.edgeCases.length > 0 || tests.regressionCases.length > 0) && (
        <Card variant="outlined" sx={{ mt: 2, mb: 2 }}>
          <CardContent>
            {tests.edgeCases.length > 0 && (
              <Box sx={{ mb: tests.regressionCases.length > 0 ? 2 : 0 }}>
                <Typography variant="subtitle2" gutterBottom>Edge Cases</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {tests.edgeCases.map((c) => (
                    <Chip key={c} label={c} size="small" variant="outlined" color="warning" />
                  ))}
                </Stack>
              </Box>
            )}
            {tests.regressionCases.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Regression Scope</Typography>
                <Stack spacing={0.5}>
                  {tests.regressionCases.map((c) => (
                    <Typography key={c} variant="body2">• {c}</Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {tests.playwrightSpecs.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <PlayCircleOutlineIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2">Playwright Automation</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              These specs run during validation and map results back to test case IDs (TC-001, TC-002, …)
            </Typography>
            <Stack spacing={1.5}>
              {tests.playwrightSpecs.map((s) => {
                const tcMatch = s.content.match(/TC-\d{3}/i)?.[0];
                return (
                  <Box
                    key={s.filename}
                    sx={{
                      p: 1.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.5,
                      bgcolor: 'grey.50',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} fontFamily="monospace">
                        {s.filename}
                      </Typography>
                      {tcMatch && (
                        <Chip label={tcMatch.toUpperCase()} size="small" color="primary" variant="outlined" />
                      )}
                    </Stack>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.75rem',
                        overflow: 'auto',
                        maxHeight: 180,
                        m: 0,
                        p: 1,
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {s.content.slice(0, 1200)}{s.content.length > 1200 ? '\n...' : ''}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
