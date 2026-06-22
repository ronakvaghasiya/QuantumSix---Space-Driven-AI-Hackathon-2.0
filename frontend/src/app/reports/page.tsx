'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Box,
  Divider,
  Alert,
} from '@mui/material';
import { KpiCard, PageHeader } from '@/components/common/KpiCard';
import { StatusChip, RiskChip } from '@/components/common/StatusChip';
import { api, AnalyticsData } from '@/lib/api';
import { agentLabel, TASK_STATUS_LABELS } from '@/lib/utils';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import MergeIcon from '@mui/icons-material/Merge';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import BugReportIcon from '@mui/icons-material/BugReport';
import FolderIcon from '@mui/icons-material/Folder';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function checkColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'pass') return 'success';
  if (status === 'fail') return 'error';
  if (status === 'skipped') return 'warning';
  return 'default';
}

function ValidationStatCard({
  title,
  stats,
}: {
  title: string;
  stats: { pass: number; fail: number; skipped: number };
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>{title}</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${stats.pass} Pass`} color="success" size="small" variant="outlined" />
          <Chip label={`${stats.fail} Fail`} color="error" size="small" variant="outlined" />
          <Chip label={`${stats.skipped} Skipped`} color="warning" size="small" variant="outlined" />
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.reports.analytics().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  const tasksChartOptions = {
    chart: { type: 'area' as const, toolbar: { show: false } },
    xaxis: { categories: data?.tasksPerDay.map((d) => d.date) || [] },
    colors: ['#00A76F'],
    fill: { type: 'gradient' as const, gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    stroke: { curve: 'smooth' as const },
    dataLabels: { enabled: false },
  };

  const prChartOptions = {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    xaxis: { categories: data?.prCreationTrend.map((d) => d.date) || [] },
    colors: ['#8E33FF'],
    plotOptions: { bar: { borderRadius: 4 } },
  };

  const statusChartOptions = {
    chart: { type: 'donut' as const },
    labels: data?.statusBreakdown.map((s) => TASK_STATUS_LABELS[s.status] || s.status) || [],
    colors: ['#919EAB', '#00B8D9', '#FFAB00', '#5119B7', '#8E33FF', '#22C55E', '#118D57', '#FF5630'],
    legend: { position: 'bottom' as const },
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Detailed pipeline analytics — tasks, QA, validation, agents, and PRs"
      />

      {!loading && data && data.awaitingApproval > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {data.awaitingApproval} task(s) waiting for your approval — open Tasks to continue the pipeline.
        </Alert>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Task Overview
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Total Tasks" value={data?.totalTasks ?? 0} icon={<AssignmentIcon />} loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="PR Created" value={data?.prCreated ?? 0} icon={<MergeIcon />} color="secondary.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Awaiting Approval" value={data?.awaitingApproval ?? 0} icon={<PendingActionsIcon />} color="warning.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="In Progress" value={data?.inProgress ?? 0} icon={<AutorenewIcon />} color="info.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Failed" value={data?.failedTasks ?? 0} icon={<ErrorIcon />} color="error.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard title="Projects Indexed" value={`${data?.indexedProjects ?? 0}/${data?.totalProjects ?? 0}`} icon={<FolderIcon />} color="success.main" loading={loading} />
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Performance
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Agent Success Rate</Typography>
              {loading ? <Skeleton height={48} /> : (
                <Typography variant="h3" color="primary.main">{data?.agentSuccessRate ?? 0}%</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Validation Pass Rate</Typography>
              {loading ? <Skeleton height={48} /> : (
                <Typography variant="h3" color="success.main">{data?.validationPassRate ?? 0}%</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Avg Analysis Time</Typography>
              {loading ? <Skeleton height={48} /> : (
                <Typography variant="h3">{data?.averageAnalysisTime ?? 0}s</Typography>
              )}
              <Typography variant="caption" color="text.secondary">Requirement → Test generation</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Avg Validation Time</Typography>
              {loading ? <Skeleton height={48} /> : (
                <Typography variant="h3">{data?.averageValidationTime ?? 0}s</Typography>
              )}
              <Typography variant="caption" color="text.secondary">ESLint/Build/QA run</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        QA & Test Verification
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Tests Passed" value={data?.qa.testsPassedTotal ?? 0} icon={<CheckCircleIcon />} color="success.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Tests Failed" value={data?.qa.testsFailedTotal ?? 0} icon={<ErrorIcon />} color="error.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Functional Tests" value={data?.qa.functionalTestsTotal ?? 0} icon={<BugReportIcon />} color="info.main" loading={loading} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Avg Coverage" value={`${data?.qa.averageRegressionCoverage ?? 0}%`} icon={<AssignmentIcon />} color="warning.main" loading={loading} />
        </Grid>
      </Grid>

      <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Validation Breakdown (ESLint · Prettier · Build)
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          {loading ? <Skeleton height={100} /> : (
            <ValidationStatCard title="ESLint / TypeScript" stats={data?.validation.eslint || { pass: 0, fail: 0, skipped: 0 }} />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? <Skeleton height={100} /> : (
            <ValidationStatCard title="Prettier" stats={data?.validation.prettier || { pass: 0, fail: 0, skipped: 0 }} />
          )}
        </Grid>
        <Grid item xs={12} md={4}>
          {loading ? <Skeleton height={100} /> : (
            <ValidationStatCard title="Build" stats={data?.validation.build || { pass: 0, fail: 0, skipped: 0 }} />
          )}
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Task Status</Typography>
              {loading ? <Skeleton height={280} /> : data?.statusBreakdown.length ? (
                <Chart
                  type="donut"
                  height={280}
                  options={statusChartOptions}
                  series={data.statusBreakdown.map((s) => s.count)}
                />
              ) : (
                <Typography color="text.secondary" variant="body2">No tasks yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Tasks Per Day</Typography>
              {loading ? <Skeleton height={280} /> : (
                <Chart
                  type="area"
                  height={280}
                  options={tasksChartOptions}
                  series={[{ name: 'Tasks', data: data?.tasksPerDay.map((d) => d.count) || [] }]}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>PR Creation Trend</Typography>
              {loading ? <Skeleton height={280} /> : (
                <Chart
                  type="bar"
                  height={280}
                  options={prChartOptions}
                  series={[{ name: 'PRs', data: data?.prCreationTrend.map((d) => d.count) || [] }]}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <SmartToyIcon color="primary" />
                <Typography variant="h6">Agent Activity</Typography>
              </Stack>
              {loading ? (
                <Skeleton height={200} />
              ) : data?.agentPerformance.length ? (
                <Stack spacing={1}>
                  {data.agentPerformance.map((a) => (
                    <Box key={a.agent} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                      <Typography variant="body2">{agentLabel(a.agent)}</Typography>
                      <Chip label={`${a.count} task(s)`} size="small" />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography color="text.secondary" variant="body2">No agent assignments yet — upload a task to start.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>QA Summary</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Playwright specs generated: <strong>{data?.qa.playwrightSpecsTotal ?? 0}</strong>
                {' · '}Validation runs: <strong>{data?.validation.totalRuns ?? 0}</strong>
                {' · '}MRs created: <strong>{data?.prsCreated ?? 0}</strong>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total verified tests passed</Typography>
                  <Typography variant="h4" color="success.main">{data?.qa.testsPassedTotal ?? 0}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Total verified tests failed</Typography>
                  <Typography variant="h4" color="error.main">{data?.qa.testsFailedTotal ?? 0}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Task Detail Report</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Click a task to see full analysis, tests, validation errors, and PR
          </Typography>
          {loading ? (
            <Skeleton height={200} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Project</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Agent</TableCell>
                    <TableCell>Risk</TableCell>
                    <TableCell>ESLint</TableCell>
                    <TableCell>Prettier</TableCell>
                    <TableCell>Build</TableCell>
                    <TableCell>Tests</TableCell>
                    <TableCell>Coverage</TableCell>
                    <TableCell>PR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.taskSummaries || []).map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      component={Link}
                      href={`/tasks/${row.id}`}
                      sx={{ textDecoration: 'none', cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="subtitle2">{row.taskId}</Typography>
                      </TableCell>
                      <TableCell>{row.projectName}</TableCell>
                      <TableCell><StatusChip status={row.status} /></TableCell>
                      <TableCell>
                        <Typography variant="caption">{agentLabel(row.assignedAgent)}</Typography>
                      </TableCell>
                      <TableCell><RiskChip risk={row.risk} /></TableCell>
                      <TableCell>
                        <Chip label={row.lintStatus.toUpperCase()} size="small" color={checkColor(row.lintStatus)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.prettierStatus.toUpperCase()} size="small" color={checkColor(row.prettierStatus)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip label={row.buildStatus.toUpperCase()} size="small" color={checkColor(row.buildStatus)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="success.main">{row.testsPassed}P</Typography>
                        {' / '}
                        <Typography variant="caption" color="error.main" component="span">{row.testsFailed}F</Typography>
                      </TableCell>
                      <TableCell>{row.regressionCoverage}%</TableCell>
                      <TableCell>
                        {row.prUrl ? (
                          <Chip
                            label={row.prNumber ? `!${row.prNumber}` : 'MR'}
                            size="small"
                            color="primary"
                            component="a"
                            href={row.prUrl}
                            target="_blank"
                            clickable
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!data?.taskSummaries.length && (
                    <TableRow>
                      <TableCell colSpan={11}>
                        <Typography color="text.secondary" align="center" py={2}>No tasks yet</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
