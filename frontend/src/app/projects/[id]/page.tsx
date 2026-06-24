'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  Stack,
  Chip,
  Skeleton,
  Divider,
  Alert,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PageHeader } from '@/components/common/KpiCard';
import { IndexingProgress } from '@/components/repository/IndexingProgress';
import { api, Project, IndexingJob, GitLabBranch } from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, formatDate } from '@/lib/utils';
import Link from 'next/link';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { MemorySnapshotsCard } from '@/components/repository/MemorySnapshotsCard';
import type { MemorySnapshot, ReindexEvent } from '@/lib/api';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [job, setJob] = useState<IndexingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [branches, setBranches] = useState<GitLabBranch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [aiProvider, setAiProvider] = useState<'openai' | 'huggingface'>('openai');
  const [aiModel, setAiModel] = useState('');
  const [aiTemperature, setAiTemperature] = useState(0.2);
  const [aiMaxTokens, setAiMaxTokens] = useState(4096);
  const [savingAi, setSavingAi] = useState(false);
  const [autoReindex, setAutoReindex] = useState(true);
  const [memorySnapshots, setMemorySnapshots] = useState<MemorySnapshot[]>([]);
  const [reindexEvents, setReindexEvents] = useState<ReindexEvent[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, status] = await Promise.all([
        api.projects.get(id),
        api.projects.indexingStatus(id).catch(() => null),
      ]);
      setProject(p);
      setJob(status?.job || null);
      if (p) {
        setAiProvider((p.aiProvider as 'openai' | 'huggingface') || 'openai');
        setAiModel(p.aiModel || '');
        setAiTemperature(p.aiTemperature ?? 0.2);
        setAiMaxTokens(p.aiMaxTokens ?? 4096);
        setAutoReindex(p.autoReindexEnabled !== false);
      }
    } catch {
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id || project?.status !== 'completed') return;
    setMemoryLoading(true);
    Promise.all([
      api.memory.snapshots(id).catch(() => []),
      api.memory.reindexEvents(id).catch(() => []),
    ]).then(([snapshots, events]) => {
      setMemorySnapshots(snapshots);
      setReindexEvents(events);
    }).finally(() => setMemoryLoading(false));
  }, [id, project?.status, project?.lastReindexAt]);

  useEffect(() => {
    if (!project?.githubRepoId) return;
    setSelectedBranch(project.defaultBranch);
    setBranchesLoading(true);
    api.gitlab.branches(Number(project.githubRepoId))
      .then((list) => {
        const names = new Set(list.map((b) => b.name));
        if (project.defaultBranch && !names.has(project.defaultBranch)) {
          list.unshift({ name: project.defaultBranch, protected: false, default: true });
        }
        setBranches(list);
      })
      .catch(() => {
        setBranches(project.defaultBranch
          ? [{ name: project.defaultBranch, protected: false, default: true }]
          : []);
      })
      .finally(() => setBranchesLoading(false));
  }, [project?.githubRepoId, project?.defaultBranch]);

  useEffect(() => {
    if (project?.status !== 'indexing') return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [project?.status, load]);

  const handleAction = async (action: 'connect' | 'reindex' | 'sync') => {
    setActionLoading(true);
    try {
      await api.projects[action](id);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleBranchChange = async () => {
    if (!project || !selectedBranch || selectedBranch === project.defaultBranch) return;
    setActionLoading(true);
    try {
      await api.projects.update(id, { defaultBranch: selectedBranch });
      await api.projects.reindex(id);
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAi = async () => {
    setSavingAi(true);
    try {
      await api.projects.update(id, {
        aiProvider,
        aiModel: aiModel || undefined,
        aiTemperature,
        aiMaxTokens,
      });
      await load();
    } finally {
      setSavingAi(false);
    }
  };

  const handleAutoReindexToggle = async (enabled: boolean) => {
    setAutoReindex(enabled);
    await api.projects.update(id, { autoReindexEnabled: enabled });
    await load();
  };

  const webhookBase = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/webhooks`
    : '/api/v1/webhooks';

  if (loading) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />;
  if (!project) return <Typography>Project not found.</Typography>;

  const statusColor = PROJECT_STATUS_COLORS[project.status] || 'default';

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={project.repositoryUrl}
        action={
          <Button component={Link} href="/projects" startIcon={<ArrowBackIcon />}>
            Back to Projects
          </Button>
        }
      />

      {project.status === 'failed' && project.indexingError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Indexing failed: {project.indexingError}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Indexing Progress</Typography>
              <IndexingProgress
                status={project.status}
                progress={project.indexingProgress}
                job={job}
                error={project.indexingError}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Repository Details</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography>
                    <Chip label={PROJECT_STATUS_LABELS[project.status] || project.status} size="small" color={statusColor} />
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Branch</Typography>
                  {branchesLoading ? (
                    <Skeleton height={40} sx={{ mt: 0.5 }} />
                  ) : branches.length > 0 ? (
                    <TextField
                      select
                      size="small"
                      fullWidth
                      value={selectedBranch || project.defaultBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      sx={{ mt: 0.5 }}
                      helperText={`${branches.length} branches`}
                    >
                      {branches.map((b) => (
                        <MenuItem key={b.name} value={b.name}>
                          {b.name}{b.default ? ' (default)' : ''}{b.protected ? ' (protected)' : ''}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <TextField
                      size="small"
                      fullWidth
                      value={selectedBranch || project.defaultBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      sx={{ mt: 0.5 }}
                      placeholder="main"
                    />
                  )}
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Framework</Typography>
                  <Typography variant="body2">{project.framework}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Language</Typography>
                  <Typography variant="body2">{project.language}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Files Indexed</Typography>
                  <Typography variant="body2">{project.filesIndexed.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="text.secondary">Last Scan</Typography>
                  <Typography variant="body2">{formatDate(project.lastScanAt)}</Typography>
                </Grid>
                {project.githubOwner && (
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">GitLab</Typography>
                    <Typography variant="body2">{project.githubOwner}/{project.githubRepoName}</Typography>
                  </Grid>
                )}
              </Grid>
              {project.description && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{project.description}</Typography>
                </>
              )}
            </CardContent>
          </Card>

          {project.status === 'completed' && (
            <MemorySnapshotsCard
              snapshots={memorySnapshots}
              events={reindexEvents}
              loading={memoryLoading}
            />
          )}

        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Intelligence</Typography>
              <Stack spacing={1.5}>
                <Button
                  component={Link}
                  href={`/projects/${id}/graph`}
                  variant="outlined"
                  fullWidth
                  startIcon={<AccountTreeIcon />}
                >
                  Knowledge Graph
                </Button>
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoReindex}
                      onChange={(e) => handleAutoReindexToggle(e.target.checked)}
                    />
                  }
                  label="Auto reindex (webhooks + cron)"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  GitLab webhook: {webhookBase}/gitlab
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  GitHub webhook: {webhookBase}/github
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>AI Provider (Project)</Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Agents and embeddings for this project use this provider — not global Settings.
              </Typography>
              <Stack spacing={2}>
                <TextField
                  select
                  label="Provider"
                  size="small"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value as 'openai' | 'huggingface')}
                  fullWidth
                >
                  <MenuItem value="openai">OpenAI</MenuItem>
                  <MenuItem value="huggingface">Hugging Face</MenuItem>
                </TextField>
                <TextField
                  label="Model"
                  size="small"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={aiProvider === 'openai' ? 'gpt-4o-mini' : 'Qwen/Qwen2.5-7B-Instruct'}
                  fullWidth
                />
                <TextField
                  label="Temperature"
                  size="small"
                  type="number"
                  inputProps={{ min: 0, max: 2, step: 0.1 }}
                  value={aiTemperature}
                  onChange={(e) => setAiTemperature(Number(e.target.value))}
                  fullWidth
                />
                <TextField
                  label="Max Tokens"
                  size="small"
                  type="number"
                  inputProps={{ min: 256, max: 32768, step: 256 }}
                  value={aiMaxTokens}
                  onChange={(e) => setAiMaxTokens(Number(e.target.value))}
                  fullWidth
                />
                <Button variant="contained" onClick={handleSaveAi} disabled={savingAi}>
                  {savingAi ? 'Saving...' : 'Save AI Settings'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              <Stack spacing={1.5}>
                {selectedBranch !== project.defaultBranch && (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    onClick={handleBranchChange}
                    disabled={actionLoading || project.status === 'indexing'}
                  >
                    Change Branch & Reindex
                  </Button>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<LinkIcon />}
                  onClick={() => handleAction('connect')}
                  disabled={actionLoading || project.status === 'indexing'}
                >
                  {project.status === 'completed' ? 'Reconnect' : 'Connect & Index'}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={() => handleAction('reindex')}
                  disabled={actionLoading || project.status === 'indexing'}
                >
                  Reindex Repository
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SyncIcon />}
                  onClick={() => handleAction('sync')}
                  disabled={actionLoading || project.status === 'indexing'}
                >
                  Sync Repository
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
