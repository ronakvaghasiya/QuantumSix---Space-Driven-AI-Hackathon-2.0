'use client';

import { Box, LinearProgress, Typography, Stack } from '@mui/material';
import { IndexingJob } from '@/lib/api';
import { PROJECT_STATUS_LABELS } from '@/lib/utils';

interface IndexingProgressProps {
  status: string;
  progress: number;
  job?: IndexingJob | null;
  error?: string | null;
}

export function IndexingProgress({ status, progress, job, error }: IndexingProgressProps) {
  const isIndexing = status === 'indexing';
  const isFailed = status === 'failed';
  const isCompleted = status === 'completed';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          {PROJECT_STATUS_LABELS[status] || status}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {Math.round(progress)}%
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        color={isFailed ? 'error' : isCompleted ? 'success' : 'primary'}
        sx={{ height: 8, borderRadius: 4, mb: 1 }}
      />

      {job?.currentStep && isIndexing && (
        <Typography variant="caption" color="text.secondary">
          {job.currentStep}
          {job.totalFiles > 0 && ` — ${job.processedFiles}/${job.totalFiles} files`}
        </Typography>
      )}

      {(error || job?.errorMessage) && isFailed && (
        <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
          {error || job?.errorMessage}
        </Typography>
      )}
    </Box>
  );
}
