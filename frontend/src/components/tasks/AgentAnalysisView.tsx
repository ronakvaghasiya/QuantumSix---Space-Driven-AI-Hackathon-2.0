'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import ApiIcon from '@mui/icons-material/Api';
import { DependencyGraphView } from '@/components/repository/DependencyGraphView';

// Re-export row — extract to shared if needed; for now duplicate minimal inline
function ImpactedFileRow({ file, confidence, rank }: { file: string; confidence: number; rank: number }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography variant="caption" sx={{ width: 24, fontWeight: 700, color: 'text.secondary' }}>{rank}</Typography>
        <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}>{file}</Typography>
        <Chip label={`${confidence}%`} size="small" color={confidence >= 75 ? 'success' : confidence >= 45 ? 'warning' : 'default'} />
      </Stack>
    </Box>
  );
}

export function AgentAnalysisView({
  impactedFiles,
  regressionAreas,
  apiDependencies,
  dependencyGraph,
}: {
  impactedFiles: { path: string; confidence: number }[];
  regressionAreas: string[];
  apiDependencies: string[];
  dependencyGraph?: Record<string, string[]>;
}) {
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={7}>
        <Card variant="outlined">
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600}>Impacted Files</Typography>
              <Typography variant="caption" color="text.secondary">Agent analysis — predicted change targets</Typography>
            </Box>
            <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
              {impactedFiles.map((f, i) => (
                <ImpactedFileRow key={f.path} file={f.path} confidence={f.confidence} rank={i + 1} />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={5}>
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <BugReportIcon fontSize="small" color="warning" />
                <Typography variant="subtitle1" fontWeight={600}>Regression Areas</Typography>
              </Stack>
              {regressionAreas.length > 0 ? (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {regressionAreas.map((a) => (
                    <Chip key={a} label={a} size="small" color="warning" variant="outlined" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">None identified</Typography>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <ApiIcon fontSize="small" color="info" />
                <Typography variant="subtitle1" fontWeight={600}>API Dependencies</Typography>
              </Stack>
              {apiDependencies.length > 0 ? (
                <List dense disablePadding>
                  {apiDependencies.map((d) => (
                    <ListItem key={d} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={d}
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace', fontSize: '0.8rem' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">None identified</Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      {dependencyGraph && Object.keys(dependencyGraph).length > 0 && (
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>Stored Dependency Graph</Typography>
              <DependencyGraphView
                edges={Object.entries(dependencyGraph).flatMap(([source, targets]) =>
                  targets.map((target) => ({ source, target }))
                )}
              />
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
