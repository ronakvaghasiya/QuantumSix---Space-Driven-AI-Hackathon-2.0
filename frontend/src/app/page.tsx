'use client';

import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Skeleton,
  Alert,
  Divider,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MergeIcon from '@mui/icons-material/Merge';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import StorageIcon from '@mui/icons-material/Storage';
import BugReportIcon from '@mui/icons-material/BugReport';
import { KpiCard, PageHeader } from '@/components/common/KpiCard';
import { StatusChip } from '@/components/common/StatusChip';
import { api, DashboardStats, Task, PullRequest } from '@/lib/api';
import { MrActionButtons, prStatusColor } from '@/components/tasks/MrActionButtons';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentPrs, setRecentPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPrs = () => {
    api.reports.recentPrs(5).then(setRecentPrs).catch(() => setRecentPrs([]));
    api.reports.dashboard().then(setStats).catch(() => undefined);
  };

  useEffect(() => {
    Promise.all([
      api.reports.dashboard().catch(() => null),
      api.tasks.recent(5).catch(() => []),
      api.reports.recentPrs(5).catch(() => []),
    ]).then(([s, tasks, prs]) => {
      setStats(s);
      setRecentTasks(tasks);
      setRecentPrs(prs);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your SDLC pipeline at a glance — projects, tasks, QA, and pull requests"
      />

      {!loading && stats && (stats.awaitingApproval > 0 || stats.inProgress > 0) && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {stats.awaitingApproval > 0 && (
            <strong>{stats.awaitingApproval} task(s)</strong>
          )}
          {stats.awaitingApproval > 0 && stats.inProgress > 0 && ' · '}
          {stats.inProgress > 0 && (
            <strong>{stats.inProgress} in progress</strong>
          )}
          {' — open Tasks to review and approve.'}
        </Alert>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Projects" value={stats?.projects ?? 0} icon={<FolderIcon />} loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Indexed" value={stats?.indexedProjects ?? 0} icon={<StorageIcon />} color="success.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Total Tasks" value={stats?.tasks ?? 0} icon={<AssignmentIcon />} color="info.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="PRs Created" value={stats?.pullRequests ?? 0} icon={<MergeIcon />} color="secondary.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Success Rate" value={`${stats?.successRate ?? 0}%`} icon={<TrendingUpIcon />} color="warning.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Agent Runs" value={stats?.agentRuns ?? 0} icon={<SmartToyIcon />} color="error.main" loading={loading} />
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Pipeline Status
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Awaiting Approval" value={stats?.awaitingApproval ?? 0} icon={<PendingActionsIcon />} color="warning.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="In Progress" value={stats?.inProgress ?? 0} icon={<AutorenewIcon />} color="info.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="PR Created" value={stats?.prCreated ?? 0} icon={<CheckCircleIcon />} color="success.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Failed" value={stats?.failedTasks ?? 0} icon={<ErrorOutlineIcon />} color="error.main" loading={loading} />
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        QA & Validation
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <KpiCard title="Validation Pass Rate" value={`${stats?.validationPassRate ?? 0}%`} icon={<BugReportIcon />} color="success.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="ESLint Failures" value={stats?.lintFailures ?? 0} icon={<ErrorOutlineIcon />} color="error.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="Build Failures" value={stats?.buildFailures ?? 0} icon={<ErrorOutlineIcon />} color="warning.main" loading={loading} />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Tasks</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Click a task to see analysis, tests, validation errors, and PR
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}
                </Stack>
              ) : recentTasks.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No tasks yet. Go to Tasks → Upload CSV to start.
                </Typography>
              ) : (
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {recentTasks.map((task) => (
                    <Box
                      key={task.id}
                      component={Link}
                      href={`/tasks/${task.id}`}
                      sx={{
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textDecoration: 'none',
                        color: 'inherit',
                        '&:hover': { bgcolor: 'action.hover', borderRadius: 1 },
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2">{task.taskId}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 280, display: 'block' }}>
                          {task.project?.name} — {task.requirement?.slice(0, 60)}
                        </Typography>
                      </Box>
                      <StatusChip status={task.status} />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Pull Requests</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                GitLab merge requests created by RepoPilot
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}
                </Stack>
              ) : recentPrs.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No PRs yet. Complete a task through validation to create one.
                </Typography>
              ) : (
                <Stack spacing={1} divider={<Divider flexItem />}>
                  {recentPrs.map((pr) => (
                    <Box
                      key={pr.id}
                      sx={{
                        py: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="subtitle2">
                            {pr.prNumber ? `MR !${pr.prNumber}` : pr.branchName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pr.task?.taskId || pr.branchName}
                            {pr.commitSha && ` · ${pr.commitSha.slice(0, 7)}`}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={pr.reviewStatus} size="small" color={prStatusColor(pr.reviewStatus)} variant="outlined" />
                          {pr.prUrl && (
                            <Chip
                              label="Open"
                              size="small"
                              component="a"
                              href={pr.prUrl}
                              target="_blank"
                              clickable
                              color="primary"
                            />
                          )}
                        </Stack>
                      </Box>
                      {(pr.task?.id || pr.taskId) && (
                        <MrActionButtons
                          taskId={pr.task?.id || pr.taskId}
                          reviewStatus={pr.reviewStatus}
                          onUpdated={refreshPrs}
                        />
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
