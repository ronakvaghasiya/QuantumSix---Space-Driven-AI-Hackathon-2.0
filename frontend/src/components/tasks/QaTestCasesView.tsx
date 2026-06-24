'use client';

import { useState } from 'react';
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
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { QaTestCaseEntry, TestEntry } from '@/lib/api';
import { formatDate } from '@/lib/utils';

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

function QaCaseCard({ tc }: { tc: QaTestCaseEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <Card variant="outlined" sx={{ mb: 1.5 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={1}>
          {statusIcon(tc.status)}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="subtitle2" fontFamily="monospace">
                {tc.id}
              </Typography>
              <Chip label={tc.status.toUpperCase()} size="small" color={statusColor(tc.status)} />
              <Chip label={tc.category} size="small" variant="outlined" />
              <Chip label={tc.priority} size="small" color={priorityColor(tc.priority)} variant="outlined" />
              {tc.verificationMethod && (
                <Chip label={tc.verificationMethod} size="small" variant="outlined" />
              )}
            </Stack>
            <Typography variant="body2" fontWeight={600}>{tc.title}</Typography>
            {tc.linkedRequirement && (
              <Typography variant="caption" color="text.secondary" display="block">
                Covers: {tc.linkedRequirement}
              </Typography>
            )}
          </Box>
          <IconButton size="small" onClick={() => setOpen(!open)} aria-label="expand">
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>

        <Collapse in={open}>
          <Box sx={{ mt: 2, pl: 4 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Preconditions</Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{tc.preconditions || '—'}</Typography>

            <Typography variant="caption" color="text.secondary" fontWeight={600}>Steps</Typography>
            <Box component="ol" sx={{ m: 0, pl: 2.5, mb: 1.5 }}>
              {tc.steps.map((step, i) => (
                <Typography component="li" variant="body2" key={i}>{step}</Typography>
              ))}
            </Box>

            <Typography variant="caption" color="text.secondary" fontWeight={600}>Expected Result</Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{tc.expectedResult}</Typography>

            {tc.actualResult && (
              <>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Actual Result (Verification)</Typography>
                <Typography
                  variant="body2"
                  sx={{ mb: 1.5, color: tc.status === 'fail' ? 'error.main' : 'success.main' }}
                >
                  {tc.actualResult}
                </Typography>
              </>
            )}

            {tc.relatedFiles && tc.relatedFiles.length > 0 && (
              <>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Related Files</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {tc.relatedFiles.map((f) => (
                    <Chip key={f} label={f} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  ))}
                </Stack>
              </>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

interface QaTestCasesViewProps {
  tests: TestEntry;
  taskStatus?: string;
}

export function QaTestCasesView({ tests, taskStatus }: QaTestCasesViewProps) {
  const cases = tests.qaTestCases || [];
  const passed = cases.filter((c) => c.status === 'pass').length;
  const failed = cases.filter((c) => c.status === 'fail').length;
  const pending = cases.filter((c) => c.status === 'pending').length;
  const verified = Boolean(tests.qaVerifiedAt);

  return (
    <Box>
      {tests.qaSummary && (
        <Alert severity={failed > 0 ? 'warning' : verified ? 'success' : 'info'} sx={{ mb: 2 }}>
          {tests.qaSummary}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Total Cases</Typography>
            <Typography variant="h6">{cases.length || tests.functionalTests.length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Passed</Typography>
            <Typography variant="h6" color="success.main">{passed || tests.functionalTests.filter((t) => t.passed).length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Failed</Typography>
            <Typography variant="h6" color="error.main">{failed || tests.functionalTests.filter((t) => !t.passed).length}</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined"><CardContent sx={{ py: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Coverage</Typography>
            <Typography variant="h6">{tests.regressionCoverage}%</Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {tests.qaGeneratedAt && (
          <Chip label={`Generated: ${formatDate(tests.qaGeneratedAt)}`} size="small" variant="outlined" />
        )}
        {tests.qaVerifiedAt && (
          <Chip label={`Verified: ${formatDate(tests.qaVerifiedAt)}`} size="small" color="success" variant="outlined" />
        )}
        {pending > 0 && !verified && (
          <Chip label={`${pending} pending verification`} size="small" color="warning" />
        )}
        {taskStatus === 'generating_code' && (
          <Chip label="QA cases generate after code" size="small" color="info" />
        )}
      </Stack>

      {cases.length > 0 ? (
        <>
          <Typography variant="subtitle2" gutterBottom>Detailed QA Test Cases</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Generated after code changes — expand each case for steps, expected vs actual results
          </Typography>
          {cases.map((tc) => (
            <QaCaseCard key={tc.id} tc={tc} />
          ))}
        </>
      ) : (
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {taskStatus === 'generating_code'
            ? 'Detailed QA test cases are being generated after code generation...'
            : 'Detailed QA test cases appear here after code generation completes.'}
        </Typography>
      )}

      {tests.edgeCases.length > 0 && (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Edge Cases</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            {tests.edgeCases.map((c) => (
              <Chip key={c} label={c} size="small" variant="outlined" color="warning" />
            ))}
          </Stack>
        </>
      )}

      {tests.regressionCases.length > 0 && (
        <>
          <Typography variant="subtitle2" gutterBottom>Regression Scope</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {tests.regressionCases.map((c) => (
              <Typography key={c} variant="body2">• {c}</Typography>
            ))}
          </Stack>
        </>
      )}

      {tests.playwrightSpecs.length > 0 && (
        <>
          <Typography variant="subtitle2" gutterBottom>Playwright Automation</Typography>
          <Stack spacing={1}>
            {tests.playwrightSpecs.map((s) => (
              <Box key={s.filename} sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={600} fontFamily="monospace">{s.filename}</Typography>
                <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 160, mt: 0.5, m: 0 }}>
                  {s.content.slice(0, 800)}{s.content.length > 800 ? '\n...' : ''}
                </Box>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}
