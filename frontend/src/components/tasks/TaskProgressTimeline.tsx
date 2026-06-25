'use client';

import { useMemo, useState } from 'react';
import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { TimelineEntry } from '@/lib/api';
import {
  TIMELINE_LABELS,
  TIMELINE_STEP_META,
  TASK_STATUS_LABELS,
} from '@/lib/utils';

const STEP_ORDER = [
  'requirement_analysis',
  'repository_analysis',
  'impact_analysis',
  'test_generation',
  'approval',
  'code_generation',
  'validation',
  'qa',
  'pr',
];

function resolveDisplayStatus(entry: TimelineEntry, index: number, ordered: TimelineEntry[]): string {
  if (entry.status !== 'pending') return entry.status;
  const laterDone = ordered.slice(index + 1).some((s) => s.status === 'completed' || s.status === 'failed');
  return laterDone ? 'completed' : 'pending';
}

function dotStyles(status: string, selected: boolean) {
  const base = {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    transition: 'all 0.2s ease',
    border: '2px solid',
  };

  if (status === 'completed') {
    return {
      ...base,
      bgcolor: selected ? '#007867' : '#00A76F',
      borderColor: selected ? '#007867' : '#00A76F',
      color: '#fff',
      boxShadow: selected ? '0 0 0 4px rgba(0,167,111,0.2)' : 'none',
    };
  }
  if (status === 'running') {
    return {
      ...base,
      bgcolor: '#fff',
      borderColor: '#00B8D9',
      color: '#00B8D9',
      boxShadow: '0 0 0 4px rgba(0,184,217,0.15)',
    };
  }
  if (status === 'failed') {
    return {
      ...base,
      bgcolor: '#FF5630',
      borderColor: '#FF5630',
      color: '#fff',
      boxShadow: selected ? '0 0 0 4px rgba(255,86,48,0.2)' : 'none',
    };
  }
  if (status === 'pending') {
    return {
      ...base,
      bgcolor: '#fff',
      borderColor: selected ? '#FFAB00' : '#DFE3E8',
      color: '#FFAB00',
    };
  }
  return {
    ...base,
    bgcolor: '#F4F6F8',
    borderColor: '#DFE3E8',
    color: '#919EAB',
  };
}

interface TaskProgressTimelineProps {
  timeline: TimelineEntry[];
  taskStatus: string;
}

export function TaskProgressTimeline({ timeline, taskStatus }: TaskProgressTimelineProps) {
  const byStep = Object.fromEntries(timeline.map((t) => [t.step, t]));
  const ordered = STEP_ORDER.map((step) => byStep[step]).filter(Boolean) as TimelineEntry[];
  const failedStep = [...ordered].reverse().find((s) => s.status === 'failed');
  const runningStep = ordered.find((s) => s.status === 'running');

  const [focusedStep, setFocusedStep] = useState<string | null>(null);

  const completedCount = useMemo(
    () => ordered.filter((s, i) => resolveDisplayStatus(s, i, ordered) === 'completed').length,
    [ordered],
  );

  const focusEntry =
    ordered.find((e) => e.step === focusedStep) || failedStep || runningStep || ordered[ordered.length - 1];
  const focusMeta = focusEntry ? TIMELINE_STEP_META[focusEntry.step] : null;
  const focusStatus = focusEntry
    ? resolveDisplayStatus(focusEntry, ordered.indexOf(focusEntry), ordered)
    : 'pending';

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.5 }}>
        <Typography variant="body2" color="text.secondary">
          {completedCount} of {ordered.length} steps complete
        </Typography>
        <Chip
          label={TASK_STATUS_LABELS[taskStatus] || taskStatus}
          size="small"
          color={
            taskStatus === 'failed'
              ? 'error'
              : taskStatus.includes('approval')
                ? 'warning'
                : taskStatus === 'completed' || taskStatus === 'pr_created'
                  ? 'success'
                  : 'default'
          }
        />
      </Stack>

      {failedStep && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          <strong>
            Step {TIMELINE_STEP_META[failedStep.step]?.order}: {TIMELINE_LABELS[failedStep.step]}
          </strong>
          {failedStep.message ? ` — ${failedStep.message}` : ''}
        </Alert>
      )}

      <Box
        sx={{
          overflowX: 'auto',
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          '&::-webkit-scrollbar': { height: 6 },
        }}
      >
        <Box sx={{ minWidth: 900, pt: 0.5, pb: 0.5 }}>
          <Stack direction="row" alignItems="center" sx={{ px: 1 }}>
            {ordered.map((entry, index) => {
              const displayStatus = resolveDisplayStatus(entry, index, ordered);
              const meta = TIMELINE_STEP_META[entry.step];
              const isSelected = focusEntry?.step === entry.step;
              const isLast = index === ordered.length - 1;
              const lineDone =
                displayStatus === 'completed' &&
                !isLast &&
                resolveDisplayStatus(ordered[index + 1], index + 1, ordered) !== 'pending';

              return (
                <Box
                  key={entry.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: isLast ? '0 0 auto' : '1 1 0',
                  }}
                >
                  <Box
                    onClick={() => setFocusedStep(entry.step)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: 96,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <Box sx={dotStyles(displayStatus, isSelected)}>
                      {displayStatus === 'completed' && <CheckIcon sx={{ fontSize: 16 }} />}
                      {displayStatus === 'failed' && <CloseIcon sx={{ fontSize: 16 }} />}
                      {displayStatus === 'running' && (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: '#00B8D9',
                            animation: 'pulse 1.2s ease-in-out infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
                            },
                          }}
                        />
                      )}
                      {(displayStatus === 'pending' || displayStatus === 'skipped') && meta?.order}
                    </Box>
                    <Typography
                      variant="caption"
                      align="center"
                      sx={{
                        mt: 1.25,
                        width: '100%',
                        px: 0.5,
                        lineHeight: 1.35,
                        fontWeight: isSelected ? 700 : 500,
                        color:
                          displayStatus === 'failed'
                            ? 'error.main'
                            : isSelected
                              ? 'primary.main'
                              : 'text.primary',
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      }}
                    >
                      {TIMELINE_LABELS[entry.step]}
                    </Typography>
                  </Box>

                  {!isLast && (
                    <Box
                      sx={{
                        flex: 1,
                        height: 2,
                        minWidth: 12,
                        bgcolor: lineDone ? '#00A76F' : '#DFE3E8',
                        borderRadius: 1,
                        mx: 0.25,
                        mb: 3.5,
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      {focusEntry && focusMeta && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: '#F9FAFB',
            border: '1px solid rgba(145,158,171,0.16)',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                Step {focusMeta.order}: {TIMELINE_LABELS[focusEntry.step]}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 560 }}>
                {focusMeta.what}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Handled by <strong>{focusMeta.agent}</strong>
              </Typography>
            </Box>
            <Chip
              label={focusStatus}
              size="small"
              sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              color={
                focusStatus === 'completed'
                  ? 'success'
                  : focusStatus === 'failed'
                    ? 'error'
                    : focusStatus === 'running'
                      ? 'info'
                      : 'default'
              }
            />
          </Stack>
        </Box>
      )}
    </Box>
  );
}
