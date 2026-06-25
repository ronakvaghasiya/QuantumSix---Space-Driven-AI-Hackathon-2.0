'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined';
import MergeTypeOutlinedIcon from '@mui/icons-material/MergeTypeOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { api, AuditLogEntry } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { colorAlpha } from '@/theme';

const ACTION_LABELS: Record<string, string> = {
  risk_assessed: 'Risk Assessed',
  similar_tasks_found: 'Similar Tasks Found',
  analysis_completed: 'Analysis Completed',
  analysis_approve: 'Analysis Approved',
  analysis_reject: 'Analysis Rejected',
  analysis_request_changes: 'Analysis Changes Requested',
  code_approve: 'Code Approved',
  code_reject: 'Code Rejected',
  code_request_changes: 'Code Changes Requested',
  code_reverted: 'Code Changes Reverted',
  code_generation_completed: 'Code Generation Completed',
  qa_test_cases_regenerated: 'QA Test Cases Regenerated',
  security_scan_completed: 'Security Scan Completed',
  pr_created: 'Pull Request Created',
  mr_merged: 'Merge Request Merged',
  mr_closed: 'Merge Request Closed',
  mr_approved: 'Merge Request Approved',
  task_memory_indexed: 'Task Memory Indexed',
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionColor(action: string): 'primary' | 'success' | 'error' | 'warning' | 'info' | 'default' {
  if (action.includes('reject') || action.includes('closed') || action.includes('failed')) return 'error';
  if (action.includes('approve') || action.includes('merged') || action.includes('completed') || action.includes('created')) return 'success';
  if (action.includes('request_changes')) return 'warning';
  if (action.includes('risk') || action.includes('security')) return 'info';
  return 'primary';
}

function ActionIcon({ action }: { action: string }) {
  if (action.includes('risk')) return <AssessmentOutlinedIcon sx={{ fontSize: 18 }} />;
  if (action.includes('code') || action.includes('generation')) return <CodeOutlinedIcon sx={{ fontSize: 18 }} />;
  if (action.includes('pr') || action.includes('mr')) return <MergeTypeOutlinedIcon sx={{ fontSize: 18 }} />;
  if (action.includes('security')) return <SecurityOutlinedIcon sx={{ fontSize: 18 }} />;
  if (action.includes('test') || action.includes('qa') || action.includes('analysis')) return <ScienceOutlinedIcon sx={{ fontSize: 18 }} />;
  if (action.includes('approve')) return <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />;
  if (action.includes('similar')) return <SearchIcon sx={{ fontSize: 18 }} />;
  return <HistoryIcon sx={{ fontSize: 18 }} />;
}

function PayloadSummary({ action, payload }: { action: string; payload: Record<string, unknown> }) {
  if (action === 'risk_assessed') {
    const score = payload.overallScore as number | undefined;
    const level = payload.riskLevel as string | undefined;
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {score != null && <Chip label={`Score: ${Math.round(score)}/100`} size="small" variant="outlined" />}
        {level && <Chip label={level.toUpperCase()} size="small" color="primary" />}
      </Stack>
    );
  }

  if (action === 'similar_tasks_found') {
    const count = payload.count as number | undefined;
    return (
      <Typography variant="body2" color="text.secondary">
        Found {count ?? 0} similar historical task{(count ?? 0) !== 1 ? 's' : ''}
      </Typography>
    );
  }

  if (action === 'analysis_completed') {
    const testCases = payload.testCases as number | undefined;
    return (
      <Typography variant="body2" color="text.secondary">
        Generated {testCases ?? 0} initial test case{(testCases ?? 0) !== 1 ? 's' : ''}
      </Typography>
    );
  }

  if (action === 'code_generation_completed') {
    const files = payload.files as string[] | undefined;
    if (!files?.length) return null;
    return (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        {files.map((f) => (
          <Chip
            key={f}
            label={f}
            size="small"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem', maxWidth: 280 }}
          />
        ))}
      </Stack>
    );
  }

  if (action.includes('approve') || action.includes('reject') || action.includes('request_changes')) {
    const reason = payload.reason as string | undefined;
    const comment = payload.comment as string | undefined;
    return (
      <Stack spacing={0.5}>
        {reason && (
          <Typography variant="body2" color="text.secondary">
            <strong>Reason:</strong> {reason}
          </Typography>
        )}
        {comment && (
          <Typography variant="body2" color="text.secondary">
            <strong>Comment:</strong> {comment}
          </Typography>
        )}
      </Stack>
    );
  }

  if (action === 'pr_created' || action.includes('mr_')) {
    const prNumber = payload.prNumber as number | string | undefined;
    const iid = payload.iid as number | undefined;
    const webUrl = payload.webUrl as string | undefined;
    return (
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        {(prNumber || iid) && <Chip label={`MR !${prNumber || iid}`} size="small" color="primary" variant="outlined" />}
        {webUrl && (
          <Typography
            component="a"
            href={webUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="caption"
            color="primary"
            sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            View on GitLab
          </Typography>
        )}
      </Stack>
    );
  }

  if (action === 'security_scan_completed') {
    const findings = payload.findings as number | undefined;
    const critical = payload.critical as number | undefined;
    return (
      <Typography variant="body2" color="text.secondary">
        {findings ?? 0} finding{(findings ?? 0) !== 1 ? 's' : ''}
        {critical != null && critical > 0 ? ` · ${critical} critical` : ''}
      </Typography>
    );
  }

  if (action === 'qa_test_cases_regenerated') {
    const count = payload.count as number | undefined;
    return (
      <Typography variant="body2" color="text.secondary">
        Regenerated {count ?? 0} detailed QA test case{(count ?? 0) !== 1 ? 's' : ''}
      </Typography>
    );
  }

  const entries = Object.entries(payload).filter(([, v]) => v != null && v !== '');
  if (entries.length === 0) return null;

  return (
    <Stack spacing={0.25}>
      {entries.slice(0, 4).map(([key, value]) => (
        <Typography key={key} variant="body2" color="text.secondary">
          <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}:</strong>{' '}
          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
        </Typography>
      ))}
    </Stack>
  );
}

function AuditTimelineItem({ log, isLast }: { log: AuditLogEntry; isLast: boolean }) {
  const [showRaw, setShowRaw] = useState(false);
  const color = actionColor(log.action);
  const hasPayload = log.payload && Object.keys(log.payload).length > 0;
  const isSystem = log.actor === 'system' || log.actor === 'pipeline';

  return (
    <Stack direction="row" spacing={2} sx={{ position: 'relative', pb: isLast ? 0 : 2.5 }}>
      {/* Timeline line + dot */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: colorAlpha(`${color}.main`, 0.1),
            color: `${color}.main`,
            zIndex: 1,
          }}
        >
          <ActionIcon action={log.action} />
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              minHeight: 24,
              bgcolor: 'divider',
              mt: 0.5,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          p: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {actionLabel(log.action)}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5 }}>
              {isSystem ? (
                <SmartToyOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              ) : (
                <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              )}
              <Typography variant="caption" color="text.secondary">
                {isSystem ? 'System' : log.actor}
              </Typography>
            </Stack>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            {formatDate(log.createdAt)}
          </Typography>
        </Stack>

        {hasPayload && log.payload && (
          <>
            <PayloadSummary action={log.action} payload={log.payload} />
            <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
              <IconButton size="small" onClick={() => setShowRaw((v) => !v)} sx={{ ml: -0.5 }}>
                {showRaw ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {showRaw ? 'Hide' : 'Show'} raw data
              </Typography>
            </Stack>
            <Collapse in={showRaw}>
              <Box
                component="pre"
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: 'grey.900',
                  color: 'grey.100',
                  borderRadius: 1.5,
                  fontSize: '0.7rem',
                  overflow: 'auto',
                  maxHeight: 200,
                  m: 0,
                }}
              >
                {JSON.stringify(log.payload, null, 2)}
              </Box>
            </Collapse>
          </>
        )}
      </Box>
    </Stack>
  );
}

function AuditSkeleton() {
  return (
    <Stack spacing={2}>
      {[1, 2, 3].map((i) => (
        <Stack key={i} direction="row" spacing={2}>
          <Skeleton variant="rounded" width={36} height={36} />
          <Skeleton variant="rounded" height={80} sx={{ flex: 1 }} />
        </Stack>
      ))}
    </Stack>
  );
}

export function AuditTab({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tasks.audit(taskId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <AuditSkeleton />;

  if (!logs.length) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ py: 4, textAlign: 'center' }}>
          <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No audit events yet.</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            Actions like analysis, approvals, and PR creation will appear here.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: colorAlpha('primary.main', 0.12),
              color: 'primary.main',
            }}
          >
            <HistoryIcon fontSize="small" />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>Audit Trail</Typography>
          <Chip label={`${logs.length} events`} size="small" variant="outlined" />
        </Stack>

        <Box>
          {logs.map((log, i) => (
            <AuditTimelineItem key={log.id} log={log} isLast={i === logs.length - 1} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
