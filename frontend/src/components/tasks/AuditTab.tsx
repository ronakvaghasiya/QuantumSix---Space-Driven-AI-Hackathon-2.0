'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Skeleton } from '@mui/material';
import { api, AuditLogEntry } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function AuditTab({ taskId }: { taskId: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.tasks.audit(taskId)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <Skeleton height={200} />;
  if (!logs.length) {
    return <Typography color="text.secondary">No audit events yet.</Typography>;
  }

  return (
    <List dense>
      {logs.map((log) => (
        <ListItem key={log.id} alignItems="flex-start" sx={{ flexDirection: 'column', alignItems: 'stretch', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Chip label={log.action} size="small" color="primary" variant="outlined" />
            <Typography variant="caption" color="text.secondary">{formatDate(log.createdAt)}</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">Actor: {log.actor}</Typography>
          {log.payload && Object.keys(log.payload).length > 0 && (
            <ListItemText
              primary={
                <Box component="pre" sx={{ fontSize: '0.75rem', m: 0, mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(log.payload, null, 2)}
                </Box>
              }
            />
          )}
        </ListItem>
      ))}
    </List>
  );
}
