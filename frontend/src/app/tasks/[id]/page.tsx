'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Stack,
  Box,
  Tabs,
  Tab,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import { PageHeader } from '@/components/common/KpiCard';
import { StatusChip, RiskChip } from '@/components/common/StatusChip';
import { ValidationDetailsView } from '@/components/tasks/ValidationDetailsView';
import { CodeDiffViewer } from '@/components/tasks/CodeDiffViewer';
import { MrActionButtons, prStatusColor } from '@/components/tasks/MrActionButtons';
import { api, TaskDetail, RepositoryIntelligenceResult } from '@/lib/api';
import { TIMELINE_LABELS, formatDate, PROJECT_STATUS_LABELS, agentLabel } from '@/lib/utils';
import { DependencyGraphView } from '@/components/repository/DependencyGraphView';
import Link from 'next/link';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function TimelineIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircleIcon color="success" />;
  if (status === 'running') return <AutorenewIcon color="info" sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }} />;
  if (status === 'failed') return <ErrorIcon color="error" />;
  return <RadioButtonUncheckedIcon color="disabled" />;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [repoIntel, setRepoIntel] = useState<RepositoryIntelligenceResult | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [fixingLint, setFixingLint] = useState(false);

  const load = () => {
    setLoading(true);
    api.tasks.get(id).then(setTask).catch(() => setTask(null)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!task) return;
    const active = ['pending', 'analyzing', 'generating_code', 'testing'].includes(task.status);
    if (!active) return;
    const timer = setInterval(() => {
      api.tasks.get(id).then(setTask).catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [id, task?.status]);

  useEffect(() => {
    if (tab !== 1 || !task?.projectId || task.project?.status !== 'completed') return;
    setIntelLoading(true);
    api.repository.intelligence(task.projectId, task.requirement, task.id)
      .then(setRepoIntel)
      .catch(() => setRepoIntel(null))
      .finally(() => setIntelLoading(false));
  }, [tab, task?.id, task?.projectId, task?.requirement, task?.project?.status]);

  const handleFixLint = async () => {
    setFixingLint(true);
    try {
      const updated = await api.tasks.fixLint(id);
      setTask(updated);
      setTab(4);
    } finally {
      setFixingLint(false);
    }
  };

  const handleApproval = async (type: 'analysis' | 'code', action: string) => {
    if (type === 'analysis') await api.tasks.approveAnalysis(id, action);
    else await api.tasks.approveCode(id, action);
    load();
  };

  if (loading) return <Skeleton variant="rectangular" height={600} sx={{ borderRadius: 2 }} />;
  if (!task) return <Typography>Task not found.</Typography>;

  const analysis = task.analysis?.[0];
  const tests = task.tests?.[0];
  const codeDiff = task.codeDiffs?.[0];
  const validation = task.validations?.[0];
  const pr = task.pullRequests?.[0];

  return (
    <>
      <PageHeader
        title={task.taskId}
        subtitle={`${task.project?.name || 'Unknown'} — ${task.requirement}`}
        action={
          <Button component={Link} href="/tasks" startIcon={<ArrowBackIcon />}>
            Back to Tasks
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Box><StatusChip status={task.status} /></Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Risk</Typography>
              <Box><RiskChip risk={task.risk} /></Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body2">{formatDate(task.createdAt)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Agent</Typography>
              <Typography variant="body2">{agentLabel(task.assignedAgent)}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Progress Timeline</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(task.timeline || []).map((step) => (
              <Chip
                key={step.id}
                icon={<TimelineIcon status={step.status} />}
                label={TIMELINE_LABELS[step.step] || step.step}
                variant={step.status === 'completed' ? 'filled' : 'outlined'}
                color={
                  step.status === 'completed'
                    ? 'success'
                    : step.status === 'running'
                      ? 'info'
                      : step.step === 'approval' && task.status === 'approval_required'
                        ? 'warning'
                        : 'default'
                }
                size="small"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Overview" />
          <Tab label="Analysis" />
          <Tab label="Tests" />
          <Tab label="Code Diff" />
          <Tab label="Validation" />
          <Tab label="Pull Request" />
        </Tabs>

        <CardContent>
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Requirement</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{task.requirement}</Typography>

                <Typography variant="subtitle2" gutterBottom>Acceptance Criteria</Typography>
                <Typography variant="body2" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {task.acceptanceCriteria || 'Pending analysis...'}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>User Stories</Typography>
                {task.userStories?.length ? (
                  <List dense>
                    {task.userStories.map((s, i) => (
                      <ListItem key={i}><ListItemText primary={s} /></ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">Pending analysis...</Typography>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Business Impact</Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{task.businessImpact || '—'}</Typography>

                <Typography variant="subtitle2" gutterBottom>Keywords</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                  {(task.keywords || []).map((k) => (
                    <Chip key={k} label={k} size="small" variant="outlined" />
                  ))}
                  {!task.keywords?.length && <Typography variant="body2" color="text.secondary">—</Typography>}
                </Stack>

                <Typography variant="subtitle2" gutterBottom>Risk Level</Typography>
                <RiskChip risk={task.risk} />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            {task.project && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography variant="subtitle2">Repository Status:</Typography>
                  <Chip
                    label={PROJECT_STATUS_LABELS[task.project.status] || task.project.status}
                    size="small"
                    color={task.project.status === 'completed' ? 'success' : 'default'}
                  />
                  {task.project.status === 'completed' && (
                    <Typography variant="caption" color="text.secondary">
                      {task.project.filesIndexed.toLocaleString()} files indexed
                    </Typography>
                  )}
                  {task.project.status === 'indexing' && (
                    <Typography variant="caption" color="info.main">
                      Indexing {task.project.indexingProgress}% — analysis unavailable until complete
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            {intelLoading ? (
              <LinearProgress sx={{ mb: 2 }} />
            ) : repoIntel ? (
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Relevant Files</Typography>
                  <List dense>
                    {repoIntel.relevantFiles.map((f) => (
                      <ListItem key={f.file}>
                        <ListItemText primary={f.file} secondary={`Confidence: ${f.confidence}%`} />
                        <LinearProgress variant="determinate" value={f.confidence} sx={{ width: 80 }} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Search Keywords</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {repoIntel.keywords.map((k) => (
                      <Chip key={k} label={k} size="small" variant="outlined" />
                    ))}
                  </Stack>
                  <Typography variant="subtitle2" gutterBottom>Confidence Scores</Typography>
                  <List dense>
                    {repoIntel.confidenceScores.slice(0, 8).map((c) => (
                      <ListItem key={c.file}>
                        <ListItemText primary={c.file} />
                        <Chip label={`${c.confidence}%`} size="small" color={c.confidence >= 80 ? 'success' : 'warning'} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>Dependency Graph</Typography>
                  <DependencyGraphView
                    edges={repoIntel.dependencyGraph}
                    adjacencyList={repoIntel.adjacencyList}
                    rootFiles={repoIntel.relevantFiles.slice(0, 3).map((f) => f.file)}
                  />
                </Grid>
              </Grid>
            ) : task.project?.status !== 'completed' ? (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Repository intelligence requires completed indexing.
              </Typography>
            ) : null}

            <Divider sx={{ my: 2 }} />

            {analysis ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Impacted Files (Agent Analysis)</Typography>
                  <List dense>
                    {analysis.impactedFiles.map((f) => (
                      <ListItem key={f.path}>
                        <ListItemText primary={f.path} secondary={`Confidence: ${f.confidence}%`} />
                        <LinearProgress variant="determinate" value={f.confidence} sx={{ width: 80 }} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>Regression Areas</Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                    {analysis.regressionAreas.map((a) => (
                      <Chip key={a} label={a} size="small" color="warning" variant="outlined" />
                    ))}
                  </Stack>
                  {analysis.dependencyGraph && (
                    <>
                      <Typography variant="subtitle2" gutterBottom>Stored Dependency Graph</Typography>
                      <DependencyGraphView
                        edges={Object.entries(analysis.dependencyGraph).flatMap(([source, targets]) =>
                          targets.map((target) => ({ source, target }))
                        )}
                      />
                    </>
                  )}
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>API Dependencies</Typography>
                  <List dense>
                    {analysis.apiDependencies.map((d) => (
                      <ListItem key={d}><ListItemText primary={d} /></ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">Agent analysis pending...</Typography>
            )}
            {task.status === 'approval_required' && !codeDiff && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleApproval('analysis', 'approve')}>Approve</Button>
                <Button variant="outlined" color="error" startIcon={<ThumbDownIcon />} onClick={() => handleApproval('analysis', 'reject')}>Reject</Button>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => handleApproval('analysis', 'request_changes')}>Request Changes</Button>
              </Stack>
            )}
          </TabPanel>

          <TabPanel value={tab} index={2}>
            {tests ? (
              <>
                <Typography variant="subtitle2" gutterBottom>Functional Tests (Verified)</Typography>
                <List dense>
                  {tests.functionalTests.map((t) => (
                    <ListItem key={t.name}>
                      <ListItemIcon>
                        {t.passed ? <CheckCircleIcon color="success" fontSize="small" /> : <ErrorIcon color="error" fontSize="small" />}
                      </ListItemIcon>
                      <ListItemText
                        primary={t.name}
                        secondary={t.passed ? 'Verified by QA pipeline' : 'Failed verification'}
                      />
                      <Chip label={t.passed ? 'PASS' : 'FAIL'} size="small" color={t.passed ? 'success' : 'error'} />
                    </ListItem>
                  ))}
                </List>
                {tests.edgeCases.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>Edge Cases</Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {tests.edgeCases.map((c) => (
                        <Chip key={c} label={c} size="small" variant="outlined" color="warning" />
                      ))}
                    </Stack>
                  </>
                )}
                {tests.regressionCases.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>Regression Cases</Typography>
                    <List dense>
                      {tests.regressionCases.map((c) => (
                        <ListItem key={c}><ListItemText primary={c} /></ListItem>
                      ))}
                    </List>
                  </>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Playwright Specs</Typography>
                <Stack spacing={1}>
                  {tests.playwrightSpecs.map((s) => (
                    <Box key={s.filename} sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight={600}>{s.filename}</Typography>
                      <Box component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: 120, mt: 0.5 }}>
                        {s.content.slice(0, 500)}{s.content.length > 500 ? '...' : ''}
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Regression Coverage: {tests.regressionCoverage}%
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary">Tests pending — generated after analysis completes.</Typography>
            )}
          </TabPanel>

          <TabPanel value={tab} index={3}>
            {codeDiff ? (
              <>
                <Typography variant="subtitle2" gutterBottom>Implementation Plan</Typography>
                <Typography variant="body2" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                  {codeDiff.implementationPlan}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>Code Changes</Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  VS Code style — original (left) vs modified (right)
                </Typography>
                <CodeDiffViewer codeDiff={codeDiff} />

                {codeDiff && !validation && task.status !== 'testing' && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleApproval('code', 'approve')}>Approve</Button>
                    <Button variant="outlined" color="error" startIcon={<ThumbDownIcon />} onClick={() => handleApproval('code', 'reject')}>Reject</Button>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => handleApproval('code', 'request_changes')}>Request Changes</Button>
                  </Stack>
                )}
              </>
            ) : (
              <Typography color="text.secondary">Code generation pending...</Typography>
            )}
          </TabPanel>

          <TabPanel value={tab} index={4}>
            {validation ? (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="caption" color="text.secondary">ESLint</Typography>
                      <Typography variant="h6" color={validation.lintStatus === 'pass' ? 'success.main' : validation.lintStatus === 'fail' ? 'error.main' : 'text.secondary'}>
                        {validation.lintStatus.toUpperCase()}
                      </Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="caption" color="text.secondary">Prettier</Typography>
                      <Typography variant="h6" color={validation.prettierStatus === 'pass' ? 'success.main' : validation.prettierStatus === 'fail' ? 'error.main' : 'text.secondary'}>
                        {(validation.prettierStatus || 'skipped').toUpperCase()}
                      </Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="caption" color="text.secondary">Build</Typography>
                      <Typography variant="h6" color={validation.buildStatus === 'pass' ? 'success.main' : validation.buildStatus === 'fail' ? 'error.main' : 'text.secondary'}>
                        {validation.buildStatus.toUpperCase()}
                      </Typography>
                    </CardContent></Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined"><CardContent>
                      <Typography variant="caption" color="text.secondary">Tests</Typography>
                      <Typography variant="h6">{validation.playwrightPassed} Passed</Typography>
                      <Typography variant="caption" color="error.main">{validation.playwrightFailed} Failed</Typography>
                    </CardContent></Card>
                  </Grid>
                </Grid>

                {(validation.lintStatus === 'fail' || validation.prettierStatus === 'fail') && (
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<BuildIcon />}
                    onClick={handleFixLint}
                    disabled={fixingLint}
                    sx={{ mb: 2 }}
                  >
                    {fixingLint ? 'Fixing...' : 'Auto-fix ESLint & Prettier'}
                  </Button>
                )}

                {validation.details || validation.lintStatus ? (
                  <ValidationDetailsView details={validation.details} validation={validation} />
                ) : (
                  <Typography color="text.secondary">Detailed validation report not available for this task.</Typography>
                )}
              </>
            ) : (
              <Typography color="text.secondary">Validation runs after you approve code changes.</Typography>
            )}
          </TabPanel>

          <TabPanel value={tab} index={5}>
            {pr ? (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Branch</Typography>
                  <Typography variant="body1">{pr.branchName}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Commit</Typography>
                  <Typography variant="body1" fontFamily="monospace">{pr.commitSha || '—'}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip label={pr.reviewStatus} color={prStatusColor(pr.reviewStatus)} size="small" />
                  </Box>
                </Grid>
                {pr.prUrl && (
                  <Grid item xs={12}>
                    <Button variant="contained" href={pr.prUrl} target="_blank" sx={{ mr: 1 }}>
                      View Pull Request {pr.prNumber ? `#${pr.prNumber}` : ''}
                    </Button>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>MR Actions</Typography>
                  <MrActionButtons taskId={id} reviewStatus={pr.reviewStatus} size="medium" onUpdated={load} />
                </Grid>
              </Grid>
            ) : (
              <Typography color="text.secondary">Pull request pending...</Typography>
            )}
          </TabPanel>
        </CardContent>
      </Card>
    </>
  );
}
