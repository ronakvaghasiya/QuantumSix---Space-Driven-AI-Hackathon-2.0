'use client';

import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SearchIcon from '@mui/icons-material/Search';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { RepositoryIntelligenceResult } from '@/lib/api';
import { DependencyGraphView } from '@/components/repository/DependencyGraphView';
import { colorAlpha } from '@/theme';

function confidenceColor(confidence: number): 'success' | 'warning' | 'error' | 'default' {
  if (confidence >= 75) return 'success';
  if (confidence >= 45) return 'warning';
  if (confidence >= 25) return 'default';
  return 'error';
}

function progressColor(confidence: number): string {
  if (confidence >= 75) return 'success.main';
  if (confidence >= 45) return 'warning.main';
  return 'error.main';
}

function FileConfidenceRow({
  file,
  confidence,
  rank,
}: {
  file: string;
  confidence: number;
  rank: number;
}) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'action.hover' },
        transition: 'background-color 0.15s',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Typography
          variant="caption"
          sx={{
            width: 24,
            height: 24,
            borderRadius: '6px',
            bgcolor: 'grey.100',
            color: 'text.secondary',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {rank}
        </Typography>
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
        <Tooltip title={file} placement="top-start">
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file}
          </Typography>
        </Tooltip>
        <Chip
          label={`${confidence}%`}
          size="small"
          color={confidenceColor(confidence)}
          sx={{ fontWeight: 600, minWidth: 52 }}
        />
      </Stack>
      <Box sx={{ mt: 1, ml: 5.5 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(confidence, 100)}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'grey.100',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: progressColor(confidence),
            },
          }}
        />
      </Box>
    </Box>
  );
}

export function RepositoryIntelligenceView({
  data,
  filesIndexed,
  projectStatus,
}: {
  data: RepositoryIntelligenceResult;
  filesIndexed?: number;
  projectStatus?: string;
}) {
  const files = data.relevantFiles.length > 0
    ? data.relevantFiles
    : data.confidenceScores.map((c) => ({ file: c.file, score: c.confidence, confidence: c.confidence }));

  const avgConfidence = files.length
    ? Math.round(files.reduce((s, f) => s + f.confidence, 0) / files.length)
    : 0;

  const uniqueKeywords = Array.from(new Set(data.keywords.filter(Boolean)));

  return (
    <Stack spacing={2.5}>
      {/* Status strip */}
      <Card
        variant="outlined"
        sx={{
          bgcolor: projectStatus === 'completed' ? colorAlpha('success.main', 0.04) : 'background.paper',
          borderColor: projectStatus === 'completed' ? colorAlpha('success.main', 0.2) : 'divider',
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FolderOpenIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>Repository Intelligence</Typography>
            </Stack>
            {projectStatus && (
              <Chip
                label={projectStatus === 'completed' ? 'Indexed' : projectStatus}
                size="small"
                color={projectStatus === 'completed' ? 'success' : 'default'}
              />
            )}
            {filesIndexed != null && (
              <Typography variant="caption" color="text.secondary">
                {filesIndexed.toLocaleString()} files in index
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Summary stats */}
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" fontWeight={700} color="primary.main">{files.length}</Typography>
              <Typography variant="caption" color="text.secondary">Relevant files</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" fontWeight={700} color="warning.main">{avgConfidence}%</Typography>
              <Typography variant="caption" color="text.secondary">Avg confidence</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ py: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
              <Typography variant="h4" fontWeight={700} color="info.main">{uniqueKeywords.length}</Typography>
              <Typography variant="caption" color="text.secondary">Keywords</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2.5}>
        {/* File list */}
        <Grid item xs={12} lg={8}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <InsertDriveFileOutlinedIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>Relevant Files</Typography>
                  <Chip label={files.length} size="small" variant="outlined" />
                </Stack>
              </Box>
              <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                {files.map((f, i) => (
                  <FileConfidenceRow key={f.file} file={f.file} confidence={f.confidence} rank={i + 1} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Keywords */}
        <Grid item xs={12} lg={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SearchIcon fontSize="small" color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>Search Keywords</Typography>
              </Stack>
              {uniqueKeywords.length > 0 ? (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {uniqueKeywords.map((k) => (
                    <Chip
                      key={k}
                      label={k}
                      size="small"
                      sx={{
                        bgcolor: colorAlpha('primary.main', 0.08),
                        color: 'primary.dark',
                        fontWeight: 500,
                        border: 'none',
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">No keywords extracted</Typography>
              )}

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                  Confidence legend
                </Typography>
                <Stack spacing={0.75}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'success.main' }} />
                    <Typography variant="caption">75%+ High match</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'warning.main' }} />
                    <Typography variant="caption">45–74% Medium</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'error.main' }} />
                    <Typography variant="caption">&lt;45% Low</Typography>
                  </Stack>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Dependency graph */}
        {data.dependencyGraph.length > 0 && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AccountTreeIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle1" fontWeight={600}>Dependency Graph</Typography>
                  <Chip label={`${data.dependencyGraph.length} edges`} size="small" variant="outlined" />
                </Stack>
                <DependencyGraphView
                  edges={data.dependencyGraph}
                  adjacencyList={data.adjacencyList}
                  rootFiles={files.slice(0, 3).map((f) => f.file)}
                />
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Stack>
  );
}
