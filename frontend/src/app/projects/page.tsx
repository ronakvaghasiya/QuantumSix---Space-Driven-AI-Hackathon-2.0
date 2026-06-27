'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Skeleton,
  Stepper,
  Step,
  StepLabel,
  Autocomplete,
  LinearProgress,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkIcon from '@mui/icons-material/Link';
import StorageIcon from '@mui/icons-material/Storage';
import { PageHeader } from '@/components/common/KpiCard';
import { api, Project, CreateProjectInput, GitLabRepo, GitLabBranch } from '@/lib/api';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, formatDate } from '@/lib/utils';
import Link from 'next/link';
import SearchInput from '@/components/common/SearchInput';
import EmptyState from '@/components/common/EmptyState';

const FRAMEWORKS = ['Next.js', 'React', 'Vue', 'Angular', 'NestJS', 'Express', 'Other'];
const LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Other'];
const STEPS = ['Project Info', 'Select Repository', 'Select Branch', 'Review'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [gitlabConnected, setGitlabConnected] = useState(false);
  const [repos, setRepos] = useState<GitLabRepo[]>([]);
  const [branches, setBranches] = useState<GitLabBranch[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState('');
  const [gitlabUsername, setGitlabUsername] = useState<string | null>(null);
  const [availableRepos, setAvailableRepos] = useState<GitLabRepo[]>([]);
  const [availableReposLoading, setAvailableReposLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<GitLabRepo | null>(null);
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [branchPickerRepo, setBranchPickerRepo] = useState<GitLabRepo | null>(null);
  const [branchPickerBranches, setBranchPickerBranches] = useState<GitLabBranch[]>([]);
  const [branchPickerBranch, setBranchPickerBranch] = useState('');
  const [form, setForm] = useState<CreateProjectInput>({
    name: '',
    repositoryUrl: '',
    defaultBranch: 'main',
    framework: 'Next.js',
    language: 'JavaScript',
    description: '',
  });

  const load = () => {
    setLoading(true);
    api.projects.list().then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setAvailableReposLoading(true);
    api.gitlab.status()
      .then(async (status) => {
        setGitlabConnected(status.connected);
        setGitlabUsername(status.username);
        if (!status.connected) {
          setAvailableRepos([]);
          return;
        }
        const list = await api.gitlab.repos();
        setAvailableRepos(list);
      })
      .catch(() => {
        setGitlabConnected(false);
        setAvailableRepos([]);
      })
      .finally(() => setAvailableReposLoading(false));
  }, []);

  const openDialog = async () => {
    setStep(0);
    setSelectedRepo(null);
    setForm({ name: '', repositoryUrl: '', defaultBranch: 'main', framework: 'Next.js', language: 'JavaScript', description: '' });
    setDialogOpen(true);
    const status = await api.gitlab.status().catch(() => ({ connected: false, authType: null, username: null, baseUrl: null, oauthConfigured: false }));
    setGitlabConnected(status.connected);
    if (status.connected) {
      setReposLoading(true);
      setReposError('');
      api.gitlab.repos()
        .then((list) => {
          setRepos(list);
          if (list.length === 0) {
            setReposError('No GitLab projects found for this token. Create a project on GitLab or paste the repo URL manually.');
          }
        })
        .catch((e) => {
          setRepos([]);
          setReposError((e as Error).message);
        })
        .finally(() => setReposLoading(false));
    }
  };

  const handleRepoSelect = async (repo: GitLabRepo | null) => {
    setSelectedRepo(repo);
    if (!repo) return;
    setForm({
      ...form,
      name: form.name || repo.name,
      repositoryUrl: repo.cloneUrl,
      defaultBranch: repo.defaultBranch,
      githubRepoId: String(repo.id),
      githubOwner: repo.namespace,
      githubRepoName: repo.name,
    });
    const branchList = await api.gitlab.branches(repo.id).catch(() => []);
    setBranches(branchList);
  };

  const handleCreate = async () => {
    const project = await api.projects.create(form);
    setDialogOpen(false);
    load();
    await api.projects.connect(project.id);
    load();
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setStep(0);
    setSelectedRepo(null);
  };

  const connectedRepoIds = new Set(
    projects.map((p) => p.githubRepoId).filter((id): id is string => !!id),
  );
  const unconnectedRepos = availableRepos.filter((r) => !connectedRepoIds.has(String(r.id)));

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      (p.framework && p.framework.toLowerCase().includes(q)) ||
      (p.language && p.language.toLowerCase().includes(q)) ||
      (p.repositoryUrl && p.repositoryUrl.toLowerCase().includes(q)) ||
      (p.githubOwner && p.githubOwner.toLowerCase().includes(q)) ||
      (p.githubRepoName && p.githubRepoName.toLowerCase().includes(q))
    );
  });

  const filteredUnconnectedRepos = unconnectedRepos.filter((r) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      (r.fullName && r.fullName.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q))
    );
  });

  const connectAndIndex = async (repo: GitLabRepo, branch?: string) => {
    setConnectingRepoId(repo.id);
    try {
      const project = await api.projects.create({
        name: repo.name,
        repositoryUrl: repo.cloneUrl,
        defaultBranch: branch || repo.defaultBranch,
        framework: 'Next.js',
        language: 'JavaScript',
        description: repo.description || '',
        githubRepoId: String(repo.id),
        githubOwner: repo.namespace,
        githubRepoName: repo.name,
      });
      await api.projects.connect(project.id);
      setBranchPickerOpen(false);
      setBranchPickerRepo(null);
      load();
    } finally {
      setConnectingRepoId(null);
    }
  };

  const openBranchPicker = async (repo: GitLabRepo) => {
    setBranchPickerRepo(repo);
    setBranchPickerBranch(repo.defaultBranch);
    setBranchPickerBranches([]);
    setBranchPickerOpen(true);
    const branchList = await api.gitlab.branches(repo.id).catch(() => []);
    setBranchPickerBranches(branchList);
    if (branchList.length > 0 && !branchList.some((b) => b.name === repo.defaultBranch)) {
      setBranchPickerBranch(branchList[0].name);
    }
  };

  const openDialogForRepo = async (repo: GitLabRepo) => {
    setRepos(availableRepos);
    setSelectedRepo(repo);
    setForm({
      name: repo.name,
      repositoryUrl: repo.cloneUrl,
      defaultBranch: repo.defaultBranch,
      framework: 'Next.js',
      language: 'JavaScript',
      description: repo.description || '',
      githubRepoId: String(repo.id),
      githubOwner: repo.namespace,
      githubRepoName: repo.name,
    });
    const branchList = await api.gitlab.branches(repo.id).catch(() => []);
    setBranches(branchList);
    setStep(2);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Select a GitLab repo → connect & index → then create tasks on it"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            Create Project
          </Button>
        }
      />

      {gitlabConnected && !loading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Workflow:</strong> ① Connect repo below → ② AI indexes code → ③ Go to <strong>Tasks</strong> → upload CSV for that project.
          {availableReposLoading
            ? ' Loading GitLab repositories...'
            : unconnectedRepos.length > 0
              ? ` ${unconnectedRepos.length} repo(s) ready to connect.`
              : projects.length > 0
                ? ' All GitLab repos connected.'
                : ' No GitLab repos found on this account.'}
        </Alert>
      )}

      {!gitlabConnected && projects.length === 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" href="/settings">Connect GitLab</Button>
        }>
          Connect GitLab in Settings to browse repositories.
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search projects by name, repository, language..."
        />
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Project Name</TableCell>
                <TableCell>Repository</TableCell>
                <TableCell>Branch</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Files</TableCell>
                <TableCell>Last Scan</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <>
                  {projects.length === 0 && unconnectedRepos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        {gitlabConnected
                          ? 'No GitLab repositories found. Create one on GitLab or use Create Project to paste a URL.'
                          : 'Connect GitLab in Settings, then your repositories will appear here.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {searchQuery && (projects.length > 0 || unconnectedRepos.length > 0) && filteredProjects.length === 0 && filteredUnconnectedRepos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 6 }}>
                        <EmptyState
                          title="No Matching Repositories"
                          description="No projects or GitLab repositories match your search query."
                          onClearSearch={() => setSearchQuery('')}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredUnconnectedRepos.map((repo) => (
                    <TableRow key={`gitlab-${repo.id}`} sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><strong>{repo.name}</strong></TableCell>
                      <TableCell>{repo.fullName}</TableCell>
                      <TableCell>{repo.defaultBranch}</TableCell>
                      <TableCell>
                        <Chip label="GitLab — not connected" size="small" color="warning" variant="outlined" />
                      </TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell>—</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openDialogForRepo(repo)}
                            disabled={connectingRepoId === repo.id}
                          >
                            Configure
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<LinkIcon />}
                            onClick={() => openBranchPicker(repo)}
                            disabled={connectingRepoId === repo.id}
                          >
                            {connectingRepoId === repo.id ? 'Connecting...' : 'Connect & Index'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProjects.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell><strong>{p.name}</strong></TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.githubOwner ? `${p.githubOwner}/${p.githubRepoName}` : p.repositoryUrl}
                      </TableCell>
                      <TableCell>{p.defaultBranch}</TableCell>
                      <TableCell>
                        <Chip
                          label={PROJECT_STATUS_LABELS[p.status] || p.status}
                          size="small"
                          color={PROJECT_STATUS_COLORS[p.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        {p.status === 'indexing' ? (
                          <LinearProgress variant="determinate" value={p.indexingProgress} sx={{ height: 6, borderRadius: 3 }} />
                        ) : (
                          `${p.indexingProgress}%`
                        )}
                      </TableCell>
                      <TableCell>{p.filesIndexed.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(p.lastScanAt)}</TableCell>
                      <TableCell align="right">
                        <IconButton component={Link} href={`/projects/${p.id}`} size="small">
                          <VisibilityIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={resetDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Project</DialogTitle>
        <DialogContent>
          <Stepper activeStep={step} sx={{ my: 2 }}>
            {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>

          {step === 0 && (
            <Stack spacing={2}>
              <TextField label="Project Name" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <TextField select label="Framework" fullWidth value={form.framework} onChange={(e) => setForm({ ...form, framework: e.target.value })}>
                {FRAMEWORKS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
              <TextField select label="Language" fullWidth value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {LANGUAGES.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
              <TextField label="Description" fullWidth multiline rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              {!gitlabConnected ? (
                <Alert severity="warning" action={
                  <Button color="inherit" size="small" href="/settings">Connect GitLab</Button>
                }>
                  Connect GitLab in Settings (Personal Access Token) to browse projects, or paste a repo URL manually.
                </Alert>
              ) : null}
              {gitlabConnected ? (
                reposLoading ? <LinearProgress /> : (
                  <>
                    {reposError ? <Alert severity="warning">{reposError}</Alert> : null}
                    <Autocomplete
                    options={repos}
                    getOptionLabel={(r) => r.fullName}
                    value={selectedRepo}
                    onChange={(_, v) => handleRepoSelect(v)}
                    renderInput={(params) => <TextField {...params} label="Select Repository" />}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id}>
                        <Stack>
                          <Typography variant="body2">{option.fullName}</Typography>
                          <Typography variant="caption" color="text.secondary">{option.description}</Typography>
                        </Stack>
                      </li>
                    )}
                  />
                  </>
                )
              ) : (
                <TextField
                  label="Repository URL"
                  fullWidth
                  value={form.repositoryUrl}
                  onChange={(e) => setForm({ ...form, repositoryUrl: e.target.value })}
                  placeholder="https://gitlab.com/group/project"
                />
              )}
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              {branches.length > 0 ? (
                <TextField select label="Branch" fullWidth value={form.defaultBranch} onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })}>
                  {branches.map((b) => <MenuItem key={b.name} value={b.name}>{b.name}{b.protected ? ' (protected)' : ''}</MenuItem>)}
                </TextField>
              ) : (
                <TextField label="Default Branch" fullWidth value={form.defaultBranch} onChange={(e) => setForm({ ...form, defaultBranch: e.target.value })} />
              )}
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2">Review</Typography>
              <Typography variant="body2"><strong>Name:</strong> {form.name}</Typography>
              <Typography variant="body2"><strong>Repository:</strong> {form.repositoryUrl || selectedRepo?.cloneUrl}</Typography>
              <Typography variant="body2"><strong>Branch:</strong> {form.defaultBranch}</Typography>
              <Typography variant="body2"><strong>Framework:</strong> {form.framework}</Typography>
              <Alert severity="info" icon={<StorageIcon />} sx={{ mt: 1 }}>
                Repository will be cloned and indexed automatically after creation.
              </Alert>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={resetDialog}>Cancel</Button>
          {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
          {step < STEPS.length - 1 ? (
            <Button
              variant="contained"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !form.name : step === 1 ? !form.repositoryUrl && !selectedRepo : false}
            >
              Next
            </Button>
          ) : (
            <Button variant="contained" onClick={handleCreate} disabled={!form.name || (!form.repositoryUrl && !selectedRepo)}>
              Create & Index
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={branchPickerOpen} onClose={() => setBranchPickerOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Branch</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {branchPickerRepo?.fullName}
            </Typography>
            {branchPickerBranches.length > 0 ? (
              <TextField
                select
                label="Branch"
                fullWidth
                value={branchPickerBranch}
                onChange={(e) => setBranchPickerBranch(e.target.value)}
              >
                {branchPickerBranches.map((b) => (
                  <MenuItem key={b.name} value={b.name}>
                    {b.name}{b.protected ? ' (protected)' : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Branch"
                fullWidth
                value={branchPickerBranch}
                onChange={(e) => setBranchPickerBranch(e.target.value)}
                placeholder="developer"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBranchPickerOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => branchPickerRepo && connectAndIndex(branchPickerRepo, branchPickerBranch)}
            disabled={!branchPickerRepo || !branchPickerBranch || connectingRepoId !== null}
          >
            {connectingRepoId ? 'Connecting...' : 'Connect & Index'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
