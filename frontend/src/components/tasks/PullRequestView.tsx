'use client';

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import MergeTypeOutlinedIcon from '@mui/icons-material/MergeTypeOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CommitIcon from '@mui/icons-material/Commit';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { CodeDiffViewer } from './CodeDiffViewer';
import { MrActionButtons, prStatusColor } from './MrActionButtons';
import { PrStatusChip } from '@/components/common/StatusChip';
import { CodeDiffEntry, PullRequest, ValidationEntry } from '@/lib/api';
import { BRAND } from '@/lib/brand';
import { colorAlpha } from '@/theme';

function fileCount(codeDiff: CodeDiffEntry): number {
  if (codeDiff.fileEdits?.length) return codeDiff.fileEdits.length;
  if (codeDiff.filesToModify?.length) return codeDiff.filesToModify.length;
  if (codeDiff.diff?.trim()) {
    return (codeDiff.diff.match(/^diff --git /gm) || []).length || 1;
  }
  return 0;
}

export function PullRequestView({
  pr,
  codeDiff,
  validation,
  taskId,
  onUpdated,
  revertible,
  reverting,
  onRevertFile,
  onRevertAll,
}: {
  pr: PullRequest;
  codeDiff?: CodeDiffEntry | null;
  validation?: ValidationEntry | null;
  taskId: string;
  onUpdated?: () => void;
  revertible?: boolean;
  reverting?: boolean;
  onRevertFile?: (path: string) => void;
  onRevertAll?: () => void;
}) {
  const filesChanged = codeDiff ? fileCount(codeDiff) : 0;
  const shortSha = pr.commitSha ? pr.commitSha.slice(0, 8) : null;

  return (
    <Stack spacing={2.5}>
      {/* PR header */}
      <Card variant="outlined">
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ mb: 2.5 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: colorAlpha('primary.main', 0.12),
                  color: 'primary.main',
                }}
              >
                <MergeTypeOutlinedIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  {pr.prNumber ? `Merge Request !${pr.prNumber}` : 'Merge Request'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                  <PrStatusChip status={pr.reviewStatus} />
                  {filesChanged > 0 && (
                    <Chip label={`${filesChanged} file${filesChanged !== 1 ? 's' : ''} changed`} size="small" variant="outlined" />
                  )}
                </Stack>
              </Box>
            </Stack>

            {pr.prUrl && (
              <Button
                variant="contained"
                href={pr.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon />}
                sx={{ flexShrink: 0 }}
              >
                Open in GitLab
              </Button>
            )}
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <CallSplitIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Source Branch</Typography>
                  <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                    {pr.branchName}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <CommitIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Commit</Typography>
                  {shortSha ? (
                    <Tooltip title={pr.commitSha || ''}>
                      <Typography variant="body2" fontFamily="monospace" fontWeight={600} noWrap>
                        {shortSha}
                      </Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">Review Status</Typography>
                  <Chip
                    label={pr.reviewStatus}
                    size="small"
                    color={prStatusColor(pr.reviewStatus)}
                    sx={{ mt: 0.25, textTransform: 'capitalize' }}
                  />
                </Box>
              </Stack>
            </Grid>
          </Grid>

          {validation && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                Validation:
              </Typography>
              <Chip label={`ESLint: ${validation.lintStatus}`} size="small" variant="outlined" color={validation.lintStatus === 'pass' ? 'success' : validation.lintStatus === 'fail' ? 'error' : 'default'} />
              <Chip label={`Build: ${validation.buildStatus}`} size="small" variant="outlined" color={validation.buildStatus === 'pass' ? 'success' : validation.buildStatus === 'fail' ? 'error' : 'default'} />
              {(validation.playwrightPassed > 0 || validation.playwrightFailed > 0) && (
                <Chip
                  label={`Tests: ${validation.playwrightPassed} pass / ${validation.playwrightFailed} fail`}
                  size="small"
                  variant="outlined"
                  color={validation.playwrightFailed > 0 ? 'error' : 'success'}
                />
              )}
            </Stack>
          )}

          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>MR Actions</Typography>
            <MrActionButtons taskId={taskId} reviewStatus={pr.reviewStatus} size="medium" onUpdated={onUpdated} />
          </Box>
        </CardContent>
      </Card>

      {/* AI code viewer */}
      {codeDiff ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <AutoAwesomeIcon color="primary" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>AI Generated Code</Typography>
              <Chip label={BRAND.name} size="small" color="primary" variant="outlined" />
            </Stack>

            {codeDiff.implementationPlan && (
              <Box
                sx={{
                  mb: 2.5,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Implementation Plan
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {codeDiff.implementationPlan}
                </Typography>
              </Box>
            )}

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Code Changes
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Side-by-side diff — original (left) vs AI modified (right)
            </Typography>

            <CodeDiffViewer
              codeDiff={codeDiff}
              revertible={revertible}
              reverting={reverting}
              onRevertFile={onRevertFile}
              onRevertAll={onRevertAll}
            />
          </CardContent>
        </Card>
      ) : (
        <Card variant="outlined">
          <CardContent sx={{ py: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">No code diff available for this pull request.</Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}
