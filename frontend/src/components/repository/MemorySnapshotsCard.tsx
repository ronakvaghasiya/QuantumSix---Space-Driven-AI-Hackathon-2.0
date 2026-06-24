'use client';

import { Card, CardContent, Typography, Stack, Chip, Skeleton } from '@mui/material';
import { formatDate } from '@/lib/utils';
import type { MemorySnapshot, ReindexEvent } from '@/lib/api';

export function MemorySnapshotsCard({
  snapshots,
  events,
  loading,
}: {
  snapshots: MemorySnapshot[];
  events: ReindexEvent[];
  loading?: boolean;
}) {
  if (loading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Repository Memory</Typography>
        {!snapshots.length ? (
          <Typography variant="body2" color="text.secondary">
            No memory snapshots yet. Snapshots are created after each full or incremental index.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {snapshots.slice(0, 5).map((s) => (
              <Stack key={s.id} direction="row" spacing={1} alignItems="center">
                <Chip
                  label={s.metadata?.incremental ? 'incremental' : 'full'}
                  size="small"
                  variant="outlined"
                />
                <Typography variant="body2" flex={1}>
                  {s.summary}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(s.createdAt)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}

        <Typography variant="subtitle2" gutterBottom>Recent Reindex Events</Typography>
        {!events.length ? (
          <Typography variant="body2" color="text.secondary">No webhook or scheduled reindex events yet.</Typography>
        ) : (
          <Stack spacing={0.5}>
            {events.slice(0, 5).map((e) => (
              <Typography key={e.id} variant="body2" color="text.secondary">
                {e.triggerSource} — {e.status} ({e.changedFiles?.length || 0} files) · {formatDate(e.createdAt)}
              </Typography>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
