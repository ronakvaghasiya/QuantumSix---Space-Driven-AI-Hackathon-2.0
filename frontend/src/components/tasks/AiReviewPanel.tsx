'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Box,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api, AiReview } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const SEVERITY_COLOR: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

function scoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

export function AiReviewPanel({ taskId }: { taskId: string }) {
  const [review, setReview] = useState<AiReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.tasks.aiReview(taskId);
      setReview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [taskId]);

  const regenerate = async () => {
    setRegenerating(true);
    setError('');
    try {
      const data = await api.tasks.regenerateAiReview(taskId);
      setReview(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <LinearProgress sx={{ my: 2 }} />;

  return (
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            AI Code Review
          </Typography>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={regenerate}
            disabled={regenerating}
          >
            {regenerating ? 'Reviewing…' : 'Regenerate'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!review ? (
          <Typography variant="body2" color="text.secondary">
            AI review runs automatically after code generation. None available yet.
          </Typography>
        ) : (
          <>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Chip
                label={`Score: ${Math.round(review.overallScore)}/100`}
                color={scoreColor(review.overallScore)}
              />
              <Typography variant="caption" color="text.secondary">
                {formatDate(review.createdAt)}
              </Typography>
            </Stack>

            {review.summary && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                {review.summary}
              </Typography>
            )}

            {!review.findings?.length ? (
              <Typography variant="body2" color="text.secondary">
                No issues flagged.
              </Typography>
            ) : (
              <List dense disablePadding>
                {review.findings.map((f, i) => (
                  <ListItem key={i} alignItems="flex-start" sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" fontWeight={600}>
                            {f.title}
                          </Typography>
                          <Chip label={f.severity} size="small" color={SEVERITY_COLOR[f.severity]} />
                          <Chip label={f.category} size="small" variant="outlined" />
                          {f.filePath && (
                            <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                              {f.filePath}
                            </Typography>
                          )}
                        </Stack>
                      }
                      secondary={f.detail}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
