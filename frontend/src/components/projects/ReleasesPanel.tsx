'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Skeleton,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { api, Release } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export function ReleasesPanel({ projectId }: { projectId: string }) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.releases
      .byProject(projectId)
      .then(setReleases)
      .catch(() => setReleases([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mt: 2 }} />;

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Releases</Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Auto-generated release notes and sprint summaries when MRs are merged.
        </Typography>

        {!releases.length ? (
          <Typography variant="body2" color="text.secondary">
            No releases yet. Merge a pull request from a completed task to generate one.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {releases.map((r) => (
              <Accordion key={r.id} disableGutters variant="outlined">
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip label={r.versionTag} size="small" color="primary" />
                    {r.task?.taskId && <Chip label={r.task.taskId} size="small" variant="outlined" />}
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(r.createdAt)}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  {r.sprintSummary && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>Sprint summary</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>{r.sprintSummary}</Typography>
                    </>
                  )}
                  {r.releaseNotes && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>Release notes</Typography>
                      <Typography
                        variant="body2"
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', mb: 2 }}
                      >
                        {r.releaseNotes}
                      </Typography>
                    </>
                  )}
                  {r.changelog?.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" gutterBottom>Changelog</Typography>
                      <Stack spacing={0.5}>
                        {r.changelog.map((c, i) => (
                          <Box key={i}>
                            <Chip label={c.type} size="small" sx={{ mr: 1 }} />
                            <Typography variant="body2" component="span">{c.description}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
