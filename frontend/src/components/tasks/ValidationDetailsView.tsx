import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ValidationDetails, ValidationEntry, ToolValidationResult } from '@/lib/api';

function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'pass') return 'success';
  if (status === 'fail') return 'error';
  if (status === 'skipped') return 'warning';
  return 'default';
}

function emptyTool(status: 'pass' | 'fail' | 'skipped' = 'skipped'): ToolValidationResult {
  return { status, command: '', errorCount: 0, warningCount: 0, issues: [], output: '' };
}

/** Old DB records may only store qaSummary — fill gaps from summary fields */
export function normalizeValidationDetails(
  raw: Partial<ValidationDetails> | Record<string, unknown> | undefined,
  entry?: ValidationEntry,
): ValidationDetails {
  const d = raw as Partial<ValidationDetails> | undefined;
  const lint = (entry?.lintStatus || d?.eslint?.status || 'skipped') as 'pass' | 'fail' | 'skipped';
  const prettier = (entry?.prettierStatus || d?.prettier?.status || 'skipped') as 'pass' | 'fail' | 'skipped';
  const build = (entry?.buildStatus || d?.build?.status || 'skipped') as 'pass' | 'fail' | 'skipped';

  const testsPassed = entry?.playwrightPassed ?? d?.tests?.passed ?? 0;
  const testsFailed = entry?.playwrightFailed ?? d?.tests?.failed ?? 0;
  const testsStatus =
    d?.tests?.status ||
    (testsFailed > 0 ? 'fail' : testsPassed > 0 ? 'pass' : 'skipped');

  return {
    qaSummary: d?.qaSummary || 'Validation completed',
    verifiedAt: d?.verifiedAt || '',
    fixApplied: d?.fixApplied,
    clonePath: d?.clonePath ?? null,
    eslint: d?.eslint || { ...emptyTool(lint), status: lint },
    prettier: d?.prettier || { ...emptyTool(prettier), status: prettier },
    build: d?.build || { ...emptyTool(build), status: build },
    tests: d?.tests || {
      status: testsStatus as 'pass' | 'fail' | 'skipped',
      command: '',
      passed: testsPassed,
      failed: testsFailed,
      results: [],
      output: typeof d?.qaSummary === 'string' ? d.qaSummary : '',
    },
  };
}

function ToolPanel({
  title,
  result,
}: {
  title: string;
  result?: ToolValidationResult;
}) {
  const r = result || emptyTool();
  const issues = r.issues || [];

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>{title}</Typography>
          <Chip label={r.status.toUpperCase()} color={statusColor(r.status)} size="small" />
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          Command: <code>{r.command || '—'}</code>
          {r.errorCount > 0 && ` · ${r.errorCount} error(s)`}
          {r.warningCount > 0 && ` · ${r.warningCount} warning(s)`}
        </Typography>

        {issues.length > 0 ? (
          <List dense sx={{ bgcolor: 'grey.50', borderRadius: 1, maxHeight: 280, overflow: 'auto' }}>
            {issues.map((issue, i) => (
              <ListItem key={i} alignItems="flex-start">
                <ErrorOutlineIcon color="error" fontSize="small" sx={{ mr: 1, mt: 0.3 }} />
                <ListItemText
                  primary={
                    issue.file
                      ? `${issue.file}${issue.line ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}` : ''}`
                      : issue.message
                  }
                  secondary={
                    issue.file
                      ? `${issue.rule ? `[${issue.rule}] ` : ''}${issue.message}`
                      : undefined
                  }
                  primaryTypographyProps={{ fontFamily: issue.file ? 'monospace' : undefined, fontSize: '0.85rem' }}
                />
              </ListItem>
            ))}
          </List>
        ) : r.status === 'pass' ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleOutlineIcon color="success" fontSize="small" />
            <Typography variant="body2" color="success.main">No issues found</Typography>
          </Stack>
        ) : r.status === 'skipped' ? (
          <Typography variant="body2" color="text.secondary">{r.output || 'Not configured in this repository'}</Typography>
        ) : null}

        {r.output && issues.length === 0 && r.status === 'fail' && (
          <Box component="pre" sx={{ mt: 1, p: 1.5, bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 200 }}>
            {r.output}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function ValidationDetailsView({
  details,
  validation,
}: {
  details?: Partial<ValidationDetails> | Record<string, unknown>;
  validation?: ValidationEntry;
}) {
  const normalized = normalizeValidationDetails(details, validation);
  const tests = normalized.tests;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {normalized.qaSummary}
        {normalized.verifiedAt && ` · Verified ${new Date(normalized.verifiedAt).toLocaleString()}`}
        {normalized.fixApplied && (
          <Chip label="Auto-fix applied" color="info" size="small" sx={{ ml: 1 }} />
        )}
      </Typography>

      <ToolPanel title="ESLint / TypeScript" result={normalized.eslint} />
      <ToolPanel title="Prettier" result={normalized.prettier} />
      <ToolPanel title="Build" result={normalized.build} />

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Test Verification</Typography>
            <Chip label={tests.status.toUpperCase()} color={statusColor(tests.status)} size="small" />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            {tests.passed} passed · {tests.failed} failed
            {tests.command && ` · ${tests.command}`}
          </Typography>
          {(tests.results || []).length > 0 && (
            <List dense>
              {tests.results.map((t) => (
                <ListItem key={t.name}>
                  <ListItemText
                    primary={t.name}
                    secondary={t.message}
                    primaryTypographyProps={{ color: t.passed ? 'success.main' : 'error.main' }}
                  />
                  <Chip label={t.passed ? 'PASS' : 'FAIL'} size="small" color={t.passed ? 'success' : 'error'} />
                </ListItem>
              ))}
            </List>
          )}
          {tests.output && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box component="pre" sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem', overflow: 'auto', maxHeight: 160 }}>
                {tests.output.slice(0, 3000)}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
