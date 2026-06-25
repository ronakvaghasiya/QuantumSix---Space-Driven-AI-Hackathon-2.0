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
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { PageHeader } from '@/components/common/KpiCard';
import { StatusChip, RiskChip } from '@/components/common/StatusChip';
import { ValidationDetailsView } from '@/components/tasks/ValidationDetailsView';
import { CodeDiffViewer } from '@/components/tasks/CodeDiffViewer';
import { QaTestCasesView } from '@/components/tasks/QaTestCasesView';
import { RejectModal } from '@/components/tasks/RejectModal';
import { AuditTab } from '@/components/tasks/AuditTab';
import { PullRequestView } from '@/components/tasks/PullRequestView';
import { SimilarTasksPanel, RiskBreakdownCard } from '@/components/tasks/IntelligencePanels';
import { TaskProgressTimeline } from '@/components/tasks/TaskProgressTimeline';
import { api, TaskDetail, RepositoryIntelligenceResult, SimilarTaskResult, RiskAssessment } from '@/lib/api';
import { formatDate, resolveActiveAgentLabel } from '@/lib/utils';
import { RepositoryIntelligenceView } from '@/components/tasks/RepositoryIntelligenceView';
import { AgentAnalysisView } from '@/components/tasks/AgentAnalysisView';
import Link from 'next/link';

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [repoIntel, setRepoIntel] = useState<RepositoryIntelligenceResult | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [fixingLint, setFixingLint] = useState(false);
  const [retryingPr, setRetryingPr] = useState(false);
  const [retryingCodegen, setRetryingCodegen] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    type: 'analysis' | 'code';
    action: 'reject' | 'request_changes';
  }>({ open: false, type: 'analysis', action: 'reject' });
  const [similarTasks, setSimilarTasks] = useState<SimilarTaskResult[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [intelPanelsLoading, setIntelPanelsLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.tasks.get(id).then(setTask).catch(() => setTask(null)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!task?.id) return;
    setIntelPanelsLoading(true);
    Promise.all([
      api.memory.similarForTask(task.id).catch(() => []),
      api.risk.get(task.id).catch(() => null),
    ]).then(([similar, risk]) => {
      setSimilarTasks(similar);
      setRiskAssessment(risk);
    }).finally(() => setIntelPanelsLoading(false));
  }, [task?.id, task?.status]);

  useEffect(() => {
    if (!task) return;
    const active = [
      'pending', 'analyzing', 'generating_tests', 'generating_code',
      'validating', 'testing', 'playwright_execution', 'qa_verification',
      'security_scan', 'creating_pr',
    ].includes(task.status);
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

  const handleRetryPr = async () => {
    setRetryingPr(true);
    try {
      const updated = await api.tasks.retryPr(id);
      setTask(updated);
      setTab(5);
    } finally {
      setRetryingPr(false);
    }
  };

  const handleRetryCodegen = async () => {
    setRetryingCodegen(true);
    try {
      const updated = await api.tasks.retryCodegen(id);
      setTask(updated);
      setTab(3);
    } finally {
      setRetryingCodegen(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm(`Restart ${task?.taskId} from the beginning? All progress will be cleared.`)) {
      return;
    }
    setRestarting(true);
    try {
      const updated = await api.tasks.restart(id);
      setTask(updated);
      setTab(0);
    } finally {
      setRestarting(false);
    }
  };

  const handleApproval = async (type: 'analysis' | 'code', action: string, reason?: string, comment?: string) => {
    if (type === 'analysis') await api.tasks.approveAnalysis(id, action, comment, reason);
    else await api.tasks.approveCode(id, action, comment, reason);
    load();
  };

  const openReject = (type: 'analysis' | 'code', action: 'reject' | 'request_changes') => {
    setRejectModal({ open: true, type, action });
  };

  if (loading) return <Skeleton variant="rectangular" height={600} sx={{ borderRadius: 2 }} />;
  if (!task) return <Typography>Task not found.</Typography>;

  const analysis = task.analysis?.[0];
  const tests = task.tests?.[0];
  const codeDiff = task.codeDiffs?.[0];
  const validation = task.validations?.[0];
  const pr = task.pullRequests?.[0];
  const isAnalysisApproval = ['analysis_approval_required', 'approval_required'].includes(task.status) && !codeDiff;
  const isCodeApproval = ['code_approval_required', 'approval_required'].includes(task.status) && !!codeDiff;
  const validationPassed = validation && validation.lintStatus !== 'fail';
  const canRetryPr = !!codeDiff && !pr && validationPassed && ['failed', 'qa_verification', 'validating'].includes(task.status);
  const canRetryCodegen = task.status === 'failed' && !codeDiff;

  return (
    <>
      <RejectModal
        open={rejectModal.open}
        title={rejectModal.action === 'reject' ? 'Reject' : 'Request Changes'}
        action={rejectModal.action}
        onClose={() => setRejectModal((s) => ({ ...s, open: false }))}
        onConfirm={(reason, comments) => {
          handleApproval(rejectModal.type, rejectModal.action, reason, comments);
        }}
      />
      <PageHeader
        title={task.taskId}
        subtitle={`${task.project?.name || 'Unknown'} — ${task.requirement}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAltIcon />}
              onClick={handleRestart}
              disabled={restarting}
            >
              {restarting ? 'Restarting...' : 'Restart'}
            </Button>
            <Button component={Link} href="/tasks" startIcon={<ArrowBackIcon />}>
              Back to Tasks
            </Button>
          </Stack>
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
              <Typography variant="caption" color="text.secondary">Active Agent</Typography>
              <Typography variant="body2">
                {resolveActiveAgentLabel(task.timeline || [], task.status)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pt: 2.5, pb: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            Pipeline Progress
          </Typography>
          <TaskProgressTimeline timeline={task.timeline || []} taskStatus={task.status} />
          {canRetryCodegen && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Alert severity="error">
                Code generation failed. The label replace logic has been fixed — click Retry to run again.
              </Alert>
              <Button
                variant="contained"
                color="primary"
                startIcon={<BuildIcon />}
                onClick={handleRetryCodegen}
                disabled={retryingCodegen}
              >
                {retryingCodegen ? 'Retrying...' : 'Retry Code Generation'}
              </Button>
            </Stack>
          )}
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
          <Tab label="Audit" />
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
              <Grid item xs={12}>
                <RiskBreakdownCard risk={riskAssessment} loading={intelPanelsLoading} />
              </Grid>
              <Grid item xs={12}>
                <SimilarTasksPanel tasks={similarTasks} loading={intelPanelsLoading} />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            {intelLoading ? (
              <LinearProgress sx={{ mb: 2 }} />
            ) : repoIntel ? (
              <Box sx={{ mb: 3 }}>
                <RepositoryIntelligenceView
                  data={repoIntel}
                  filesIndexed={task.project?.filesIndexed}
                  projectStatus={task.project?.status}
                />
              </Box>
            ) : task.project?.status !== 'completed' ? (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Repository intelligence requires completed indexing.
              </Typography>
            ) : null}

            <Divider sx={{ my: 3 }} />

            {analysis ? (
              <AgentAnalysisView
                impactedFiles={analysis.impactedFiles}
                regressionAreas={analysis.regressionAreas}
                apiDependencies={analysis.apiDependencies}
                dependencyGraph={analysis.dependencyGraph ?? undefined}
              />
            ) : (
              <Typography color="text.secondary">Agent analysis pending...</Typography>
            )}
            {isAnalysisApproval && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleApproval('analysis', 'approve')}>Approve Tests & Analysis</Button>
                <Button variant="outlined" color="error" startIcon={<ThumbDownIcon />} onClick={() => openReject('analysis', 'reject')}>Reject</Button>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openReject('analysis', 'request_changes')}>Request Changes</Button>
              </Stack>
            )}
          </TabPanel>

          <TabPanel value={tab} index={2}>
            {tests ? (
              <QaTestCasesView tests={tests} taskStatus={task.status} />
            ) : (
              <Typography color="text.secondary">
                QA test plan pending — detailed cases are generated after code generation, then executed during validation.
              </Typography>
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

                {isCodeApproval && !validation && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={() => handleApproval('code', 'approve')}>Approve Code</Button>
                    <Button variant="outlined" color="error" startIcon={<ThumbDownIcon />} onClick={() => openReject('code', 'reject')}>Reject</Button>
                    <Button variant="outlined" startIcon={<EditIcon />} onClick={() => openReject('code', 'request_changes')}>Request Changes</Button>
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
                  <Stack spacing={2} sx={{ mb: 2 }}>
                    <Alert severity="info">
                      Pull request is not created until validation passes. Code approval is already done — click
                      Auto-fix below; PR will be created automatically when ESLint passes.
                    </Alert>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<BuildIcon />}
                      onClick={handleFixLint}
                      disabled={fixingLint}
                    >
                      {fixingLint ? 'Fixing...' : 'Auto-fix ESLint & Prettier'}
                    </Button>
                  </Stack>
                )}

                {canRetryPr && validation.lintStatus !== 'fail' && (
                  <Stack spacing={2} sx={{ mb: 2 }}>
                    <Alert severity="success">
                      Validation passed. You can create the GitLab merge request now.
                    </Alert>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<MergeTypeIcon />}
                      onClick={handleRetryPr}
                      disabled={retryingPr}
                    >
                      {retryingPr ? 'Creating PR...' : 'Create Pull Request'}
                    </Button>
                  </Stack>
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
              <PullRequestView
                pr={pr}
                codeDiff={codeDiff}
                validation={validation}
                taskId={id}
                onUpdated={load}
              />
            ) : codeDiff ? (
              <Stack spacing={2}>
                {task.status === 'failed' && validationPassed ? (
                  <>
                    <Alert severity="warning">
                      Pipeline stopped before PR creation. Validation is OK — use Create Pull Request on the Validation tab.
                    </Alert>
                    <Button
                      variant="contained"
                      startIcon={<MergeTypeIcon />}
                      onClick={handleRetryPr}
                      disabled={retryingPr}
                    >
                      {retryingPr ? 'Creating PR...' : 'Create Pull Request'}
                    </Button>
                  </>
                ) : (
                  <Typography color="text.secondary">
                    Pull request is being created. Review AI-generated code below while waiting.
                  </Typography>
                )}
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight={700}>AI Generated Code</Typography>
                      <Chip label="Pending PR" size="small" color="warning" variant="outlined" />
                    </Stack>
                    <CodeDiffViewer codeDiff={codeDiff} />
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Typography color="text.secondary">Pull request pending — code generation must complete first.</Typography>
            )}
          </TabPanel>

          <TabPanel value={tab} index={6}>
            <AuditTab taskId={id} />
          </TabPanel>
        </CardContent>
      </Card>
    </>
  );
}
