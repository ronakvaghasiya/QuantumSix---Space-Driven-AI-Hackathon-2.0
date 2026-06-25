'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Skeleton,
  Alert,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { PageHeader } from '@/components/common/KpiCard';
import { StatusChip, RiskChip } from '@/components/common/StatusChip';
import { api, Task, Project } from '@/lib/api';
import { formatDate, resolveAssignedAgentDisplay } from '@/lib/utils';
import Link from 'next/link';

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      api.tasks.list().catch((e) => {
        setError((e as Error).message);
        return [] as Task[];
      }),
      api.projects.list().catch(() => []),
    ]).then(([t, p]) => {
      setTasks(t);
      setProjects(p);
      if (p.length > 0 && !selectedProject) setSelectedProject(p[0].id);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!selectedProject || !csvContent.trim()) return;
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const created = await api.tasks.upload({ projectId: selectedProject, csvContent });
      setUploadOpen(false);
      setCsvContent('');
      if (created.length === 1) {
        router.push(`/tasks/${created[0].id}`);
        return;
      }
      setSuccess(`Created ${created.length} tasks`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvContent(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`Delete task ${task.taskId} permanently? This cannot be undone.`)) {
      return;
    }
    setDeletingId(task.id);
    setError('');
    try {
      await api.tasks.delete(task.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle="Manage and track AI agent tasks"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              component="a"
              href="/sample-tasks.csv"
              download="sample-tasks.csv"
            >
              Sample CSV
            </Button>
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadOpen(true)}>
              Upload CSV
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {!loading && projects.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" href="/projects">Go to Projects</Button>
        }>
          No project connected yet. First connect a GitLab repo on the <strong>Projects</strong> page, then upload tasks here.
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Task ID</TableCell>
                <TableCell>Project</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Assigned Agent</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    No tasks yet. Upload a CSV to create tasks.
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.id} hover>
                    <TableCell><strong>{task.taskId}</strong></TableCell>
                    <TableCell>{task.project?.name || '—'}</TableCell>
                    <TableCell><StatusChip status={task.status} /></TableCell>
                    <TableCell><RiskChip risk={task.risk} /></TableCell>
                    <TableCell>{formatDate(task.createdAt)}</TableCell>
                    <TableCell>{resolveAssignedAgentDisplay(task.assignedAgent, task.status)}</TableCell>
                    <TableCell align="right">
                      <IconButton component={Link} href={`/tasks/${task.id}`} size="small" title="View">
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        title="Delete"
                        disabled={deletingId === task.id}
                        onClick={() => handleDelete(task)}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Tasks (CSV)</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Project"
              fullWidth
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </TextField>
            <Button variant="outlined" component="label">
              Choose CSV File
              <input type="file" accept=".csv" hidden onChange={handleFileUpload} />
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              component="a"
              href="/sample-tasks.csv"
              download="sample-tasks.csv"
              sx={{ alignSelf: 'flex-start' }}
            >
              Download sample CSV
            </Button>
            <TextField
              label="CSV Content"
              fullWidth
              multiline
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder={'task_id,requirement\nBB-14342,Upload artwork preview issue\nBB-14343,Canvas synchronization issue'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpload} disabled={uploading || !selectedProject || !csvContent.trim()}>
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
