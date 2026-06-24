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
  TableHead,
  TableRow,
  Chip,
  Stack,
  Box,
  LinearProgress,
  Alert,
} from '@mui/material';
import { KpiCard, PageHeader } from '@/components/common/KpiCard';
import { api, EngineeringDashboard } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorageIcon from '@mui/icons-material/Storage';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import Link from 'next/link';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function healthColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 75) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

export default function AnalyticsPage() {
  const [data, setData] = useState<EngineeringDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.analytics
      .engineering()
      .then(setData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Engineering Analytics" subtitle="Org-scoped risk, health, and release intelligence" />
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Engineering Analytics" subtitle="Org-scoped risk, health, and release intelligence" />
        <Alert severity="error">{error || 'Failed to load analytics'}</Alert>
      </>
    );
  }

  const { summary } = data;

  const riskChartOptions = {
    chart: { type: 'line' as const, toolbar: { show: false } },
    xaxis: { categories: data.riskTrends.map((d) => d.date) },
    colors: ['#FF5630', '#00A76F'],
    stroke: { curve: 'smooth' as const },
    legend: { position: 'top' as const },
  };

  const riskChartSeries = [
    { name: 'Avg risk score', data: data.riskTrends.map((d) => d.averageScore) },
    { name: 'High-risk assessments', data: data.riskTrends.map((d) => d.highRiskCount) },
  ];

  const tasksChartOptions = {
    chart: { type: 'bar' as const, toolbar: { show: false } },
    xaxis: { categories: data.tasksPerDay.map((d) => d.date) },
    colors: ['#00A76F'],
  };

  return (
    <>
      <PageHeader
        title="Engineering Analytics"
        subtitle="Risk trends, repository health, and release velocity for your organization"
      />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Task success rate" value={`${summary.taskSuccessRate}%`} icon={<TrendingUpIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Avg risk score" value={String(summary.avgRiskScore)} icon={<AssignmentIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Indexed projects" value={`${summary.indexedProjects}/${summary.projects}`} icon={<StorageIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="Merged releases" value={String(summary.mergedReleases)} icon={<NewReleasesIcon />} color="info" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Risk trends (30 days)</Typography>
              {data.riskTrends.length > 0 ? (
                <Chart type="line" height={280} options={riskChartOptions} series={riskChartSeries} />
              ) : (
                <Typography color="text.secondary">No risk assessments yet — run task analysis to populate trends.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Risk distribution</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {Object.entries(data.riskDistribution).map(([level, count]) => (
                  <Chip key={level} label={`${level}: ${count}`} size="small" />
                ))}
                {!Object.keys(data.riskDistribution).length && (
                  <Typography variant="body2" color="text.secondary">No data</Typography>
                )}
              </Stack>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Task throughput</Typography>
              {data.tasksPerDay.length > 0 ? (
                <Chart
                  type="bar"
                  height={180}
                  options={tasksChartOptions}
                  series={[{ name: 'Tasks', data: data.tasksPerDay.map((d) => d.count) }]}
                />
              ) : (
                <Typography color="text.secondary">No tasks yet</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Repository health</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Project</TableCell>
                    <TableCell>Health</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Files</TableCell>
                    <TableCell>Task success</TableCell>
                    <TableCell>Avg risk</TableCell>
                    <TableCell>Validation pass</TableCell>
                    <TableCell>Reindexes (30d)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.repositoryHealth.map((p) => (
                    <TableRow key={p.projectId} hover>
                      <TableCell>
                        <Link href={`/projects/${p.projectId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          {p.projectName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={p.healthScore}
                            color={healthColor(p.healthScore)}
                            sx={{ flex: 1, height: 8, borderRadius: 1 }}
                          />
                          <Typography variant="caption">{p.healthScore}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell><Chip label={p.status} size="small" /></TableCell>
                      <TableCell>{p.filesIndexed.toLocaleString()}</TableCell>
                      <TableCell>{p.taskSuccessRate}%</TableCell>
                      <TableCell>{p.avgRiskScore}</TableCell>
                      <TableCell>{p.validationPassRate}%</TableCell>
                      <TableCell>{p.recentReindexes}</TableCell>
                    </TableRow>
                  ))}
                  {!data.repositoryHealth.length && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Typography color="text.secondary">No projects in this organization</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent releases</Typography>
              {!data.recentReleases.length ? (
                <Typography color="text.secondary">
                  Releases are auto-generated when merge requests are merged.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {data.recentReleases.map((r) => (
                    <Box key={r.id} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={r.versionTag} size="small" color="primary" />
                        <Typography variant="body2" fontWeight={600}>{r.projectName}</Typography>
                        {r.taskId && <Chip label={r.taskId} size="small" variant="outlined" />}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                          {formatDate(r.createdAt)}
                        </Typography>
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
