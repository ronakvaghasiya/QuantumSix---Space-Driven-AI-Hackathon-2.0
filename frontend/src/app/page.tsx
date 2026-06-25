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
  Button,
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
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { KpiCard, PageHeader } from '@/components/common/KpiCard';
import { StatusChip, RiskChip, PrStatusChip } from '@/components/common/StatusChip';
import { api, DashboardStats, Task, PullRequest, Project } from '@/lib/api';
import { MrActionButtons } from '@/components/tasks/MrActionButtons';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  formatDate,
  resolveAssignedAgentDisplay,
} from '@/lib/utils';
import { colorAlpha } from '@/theme';
import { BRAND } from '@/lib/brand';
import Link from 'next/link';

function projectIconColor(status: string): string {
  if (status === 'completed') return 'success.main';
  if (status === 'failed') return 'error.main';
  if (status === 'indexing') return 'info.main';
  return 'warning.main';
}

function DashboardProjectBox({ project }: { project: Project }) {
  const iconColor = projectIconColor(project.status);

  return (
    <Box
      component={Link}
      href={`/projects/${project.id}`}
      sx={{
        display: 'block',
        height: '100%',
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.2s, box-shadow 0.2s, transform 0.15s',
        '&:hover': {
          borderColor: 'primary.light',
          boxShadow: '0 8px 24px -10px rgba(0, 167, 111, 0.35)',
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 48,
            height: 48,
            flexShrink: 0,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: colorAlpha(iconColor, 0.12),
            color: iconColor,
          }}
        >
          <FolderIcon />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
              {project.name}
            </Typography>
            <Chip
              label={PROJECT_STATUS_LABELS[project.status] || project.status}
              size="small"
              color={PROJECT_STATUS_COLORS[project.status] || 'default'}
              sx={{ flexShrink: 0, height: 22, fontSize: '0.7rem' }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.5 }}>
            {project.repositoryUrl}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1.5} sx={{ mt: 1.25 }}>
            <Typography variant="caption" color="text.secondary">
              <strong>{(project.filesIndexed ?? 0).toLocaleString()}</strong> files
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {project.framework}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {project.language}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.75 }}>
            Last scan: {formatDate(project.lastScanAt)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentPrs, setRecentPrs] = useState<PullRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    Promise.all([
      api.reports.dashboard().catch(() => null),
      api.tasks.recent(8).catch(() => []),
      api.reports.recentPrs(5).catch(() => []),
      api.projects.list().catch(() => []),
    ]).then(([s, tasks, prs, p]) => {
      if (s) setStats(s);
      setRecentTasks(tasks);
      setRecentPrs(prs);
      setProjects(p);
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.reports.dashboard().catch(() => null),
      api.tasks.recent(8).catch(() => []),
      api.reports.recentPrs(5).catch(() => []),
      api.projects.list().catch(() => []),
    ])
      .then(([s, tasks, prs, p]) => {
        if (s) setStats(s);
        setRecentTasks(tasks);
        setRecentPrs(prs);
        setProjects(p);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`${BRAND.tagline} — projects, tasks, QA, and merge requests at a glance`}
        action={
          <Button component={Link} href="/reports" variant="outlined" size="small" endIcon={<ArrowForwardIcon />}>
            Full Reports
          </Button>
        }
      />

      {!loading && stats && (stats.awaitingApproval > 0 || stats.inProgress > 0) && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          {stats.awaitingApproval > 0 && <strong>{stats.awaitingApproval} awaiting approval</strong>}
          {stats.awaitingApproval > 0 && stats.inProgress > 0 && ' · '}
          {stats.inProgress > 0 && <strong>{stats.inProgress} in progress</strong>}
          {' — '}
          <Link href="/tasks">open Tasks</Link> to review.
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
        <Grid item xs={12} sm={4}>
          <KpiCard title="Validation Pass Rate" value={`${stats?.validationPassRate ?? 0}%`} icon={<BugReportIcon />} color="success.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="ESLint Failures" value={stats?.lintFailures ?? 0} icon={<ErrorOutlineIcon />} color="error.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4}>
          <KpiCard title="Build Failures" value={stats?.buildFailures ?? 0} icon={<ErrorOutlineIcon />} color="warning.main" loading={loading} />
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">Projects</Typography>
              <Typography variant="caption" color="text.secondary">
                Indexed repositories and scan status
              </Typography>
            </Box>
            <Button component={Link} href="/projects" size="small" endIcon={<FolderIcon fontSize="small" />}>
              Manage
            </Button>
          </Stack>

          {loading ? (
            <Grid container spacing={2}>
              {[1, 2, 3].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : projects.length === 0 ? (
            <Box
              sx={{
                py: 4,
                px: 2,
                textAlign: 'center',
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'grey.50',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No projects yet — connect GitLab in Settings and add a repository.
              </Typography>
              <Button component={Link} href="/projects" size="small" sx={{ mt: 1.5 }}>
                Go to Projects
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {projects.map((p) => (
                <Grid item xs={12} sm={6} md={4} key={p.id}>
                  <DashboardProjectBox project={p} />
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Tasks</Typography>
                <Button component={Link} href="/tasks" size="small">View all</Button>
              </Stack>
              {loading ? (
                <Stack spacing={1}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={52} />)}
                </Stack>
              ) : recentTasks.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No tasks yet — go to Tasks and upload a CSV to start.
                </Typography>
              ) : (
                <Stack spacing={0} divider={<Divider flexItem />}>
                  {recentTasks.map((task) => (
                    <Box
                      key={task.id}
                      component={Link}
                      href={`/tasks/${task.id}`}
                      sx={{
                        py: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                        textDecoration: 'none',
                        color: 'inherit',
                        borderRadius: 1,
                        px: 0.5,
                        mx: -0.5,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="subtitle2">{task.taskId}</Typography>
                          {task.risk && task.risk !== 'low' && <RiskChip risk={task.risk} />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: { xs: 200, sm: 320 }, display: 'block' }}>
                          {task.project?.name}
                          {(() => {
                            const agent = resolveAssignedAgentDisplay(task.assignedAgent, task.status);
                            return agent !== '—' ? ` · ${agent}` : '';
                          })()}
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
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Pull Requests</Typography>
                <Button component={Link} href="/tasks" size="small">View tasks</Button>
              </Stack>
              {loading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height={64} />)}
                </Stack>
              ) : recentPrs.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No PRs yet — complete a task through validation to create one.
                </Typography>
              ) : (
                <Stack spacing={0} divider={<Divider flexItem />}>
                  {recentPrs.map((pr) => (
                    <Box key={pr.id} sx={{ py: 1.5 }}>
                      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {pr.prNumber ? `MR !${pr.prNumber}` : pr.branchName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                            {pr.task?.taskId || '—'}
                            {pr.branchName && ` · ${pr.branchName}`}
                          </Typography>
                          {(pr.task?.id || pr.taskId) && ['open', 'approved'].includes(pr.reviewStatus) && (
                            <Box sx={{ mt: 1 }}>
                              <MrActionButtons
                                taskId={pr.task?.id || pr.taskId}
                                reviewStatus={pr.reviewStatus}
                                onUpdated={refresh}
                                size="small"
                              />
                            </Box>
                          )}
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.75} flexShrink={0}>
                          <PrStatusChip status={pr.reviewStatus} />
                          {pr.prUrl && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              href={pr.prUrl}
                              target="_blank"
                              component="a"
                              endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                              sx={{
                                borderColor: 'divider',
                                color: 'text.secondary',
                                fontSize: '0.75rem',
                                py: 0.25,
                                minHeight: 28,
                              }}
                            >
                              GitLab
                            </Button>
                          )}
                        </Stack>
                      </Stack>
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
