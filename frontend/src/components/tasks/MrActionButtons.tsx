'use client';

import { useState } from 'react';
import { Button, Stack, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MergeIcon from '@mui/icons-material/Merge';
import CloseIcon from '@mui/icons-material/Close';
import { api } from '@/lib/api';

type MrAction = 'approve' | 'merge' | 'close';

interface MrActionButtonsProps {
  taskId: string;
  reviewStatus: string;
  size?: 'small' | 'medium';
  onUpdated?: () => void;
}

export function MrActionButtons({
  taskId,
  reviewStatus,
  size = 'small',
  onUpdated,
}: MrActionButtonsProps) {
  const [loading, setLoading] = useState<MrAction | null>(null);

  if (!['open', 'approved'].includes(reviewStatus)) return null;

  const run = async (action: MrAction) => {
    setLoading(action);
    try {
      if (action === 'approve') await api.tasks.approvePr(taskId);
      else if (action === 'merge') await api.tasks.mergePr(taskId);
      else await api.tasks.closePr(taskId);
      onUpdated?.();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      <Button
        size={size}
        variant="outlined"
        color="info"
        startIcon={loading === 'approve' ? <CircularProgress size={14} /> : <CheckCircleIcon />}
        disabled={!!loading}
        onClick={() => run('approve')}
      >
        Approve
      </Button>
      <Button
        size={size}
        variant="contained"
        color="success"
        startIcon={loading === 'merge' ? <CircularProgress size={14} color="inherit" /> : <MergeIcon />}
        disabled={!!loading}
        onClick={() => run('merge')}
      >
        Merge
      </Button>
      <Button
        size={size}
        variant="outlined"
        color="error"
        startIcon={loading === 'close' ? <CircularProgress size={14} /> : <CloseIcon />}
        disabled={!!loading}
        onClick={() => run('close')}
      >
        Close
      </Button>
    </Stack>
  );
}

export function prStatusColor(status: string): 'success' | 'primary' | 'default' | 'info' | 'warning' | 'error' {
  if (status === 'merged') return 'primary';
  if (status === 'approved') return 'info';
  if (status === 'closed') return 'default';
  if (status === 'open') return 'success';
  return 'warning';
}
