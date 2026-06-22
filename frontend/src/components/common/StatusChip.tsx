'use client';

import { Chip } from '@mui/material';
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS, RISK_COLORS } from '@/lib/utils';

export function StatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={TASK_STATUS_LABELS[status] || status}
      color={TASK_STATUS_COLORS[status] || 'default'}
      size="small"
      sx={{
        fontWeight: 600,
        ...(TASK_STATUS_COLORS[status] === 'default' && {
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
