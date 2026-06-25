'use client';

import { Chip } from '@mui/material';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, RISK_COLORS, PR_STATUS_LABELS, PR_STATUS_COLORS } from '@/lib/utils';

export function StatusChip({ status }: { status: string }) {
  const color = TASK_STATUS_COLORS[status] || 'default';
  return (
    <Chip
      label={TASK_STATUS_LABELS[status] || status}
      color={color}
      size="small"
      variant={color === 'error' ? 'outlined' : 'filled'}
      sx={{
        fontWeight: 600,
        flexShrink: 0,
        ...(color === 'default' && {
          bgcolor: 'grey.200',
        }),
      }}
    />
  );
}

export function RiskChip({ risk }: { risk: string }) {
  return (
    <Chip
      label={risk.charAt(0).toUpperCase() + risk.slice(1)}
      color={RISK_COLORS[risk] || 'default'}
      size="small"
      variant="outlined"
    />
  );
}

export function PrStatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={PR_STATUS_LABELS[status] || status}
      color={PR_STATUS_COLORS[status] || 'warning'}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, minWidth: 72, textTransform: 'capitalize' }}
    />
  );
}
