export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

function parseApiError(body: string, status: number): string {
  if (body.trimStart().startsWith('<!DOCTYPE') || body.trimStart().startsWith('<html')) {
    return `Backend not reachable (HTTP ${status}). Start the API: cd backend && npm run start:dev`;
  }
  try {
    const json = JSON.parse(body) as { message?: string | string[] };
    const msg = json.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  } catch {
    // not JSON
  }
  return body.slice(0, 200) || `API error: ${status}`;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(parseApiError(body, res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  projects: {
    list: () => fetchApi<Project[]>('/projects'),
    get: (id: string) => fetchApi<Project>(`/projects/${id}`),
    create: (data: CreateProjectInput) =>
      fetchApi<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateProjectInput>) =>
      fetchApi<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    connect: (id: string, data?: ConnectProjectInput) =>
      fetchApi<Project>(`/projects/${id}/connect`, {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }),
    reindex: (id: string) =>
      fetchApi<Project>(`/projects/${id}/reindex`, { method: 'POST' }),
    sync: (id: string) =>
      fetchApi<Project>(`/projects/${id}/sync`, { method: 'POST' }),
    indexingStatus: (id: string) =>
      fetchApi<IndexingStatusResponse>(`/projects/${id}/indexing-status`),
  },
  gitlab: {
    status: () => fetchApi<GitLabStatus>('/gitlab/status'),
    savePat: (token: string, baseUrl?: string) =>
      fetchApi('/gitlab/token', {
        method: 'POST',
        body: JSON.stringify({ token, baseUrl }),
      }),
    disconnect: () => fetchApi('/gitlab/disconnect', { method: 'DELETE' }),
    repos: (page = 1) => fetchApi<GitLabRepo[]>(`/gitlab/repos?page=${page}`),
    branches: (projectId: number) =>
      fetchApi<GitLabBranch[]>(`/gitlab/repos/branches?projectId=${projectId}`),
    authUrl: () => `${typeof window !== 'undefined' ? window.location.origin : ''}${API_BASE}/gitlab/auth`,
  },
  settings: {
    embeddingStatus: () => fetchApi<EmbeddingStatus>('/settings/embedding'),
    setEmbeddingProvider: (provider: 'openai' | 'huggingface') =>
      fetchApi<{ provider: string }>('/settings/embedding/provider', {
        method: 'POST',
        body: JSON.stringify({ provider }),
      }),
    openAiStatus: () => fetchApi<OpenAiKeyStatus>('/settings/openai'),
    saveOpenAiKey: (apiKey: string) =>
      fetchApi<{ saved: boolean; keyPreview: string }>('/settings/openai', {
        method: 'POST',
        body: JSON.stringify({ apiKey }),
      }),
    clearOpenAiKey: () => fetchApi<{ cleared: boolean }>('/settings/openai', { method: 'DELETE' }),
    huggingFaceStatus: () => fetchApi<HuggingFaceKeyStatus>('/settings/huggingface'),
    saveHuggingFaceKey: (apiKey: string, model?: string) =>
      fetchApi<{ saved: boolean; keyPreview: string; model: string; dimensions: number }>(
        '/settings/huggingface',
        { method: 'POST', body: JSON.stringify({ apiKey, model }) },
      ),
    clearHuggingFaceKey: () =>
      fetchApi<{ cleared: boolean }>('/settings/huggingface', { method: 'DELETE' }),
  },
  repository: {
    search: (projectId: string, query: string, limit = 10) =>
      fetchApi<SearchResponse>('/repository/search', {
        method: 'POST',
        body: JSON.stringify({ projectId, query, limit }),
      }),
    intelligence: (projectId: string, requirement: string, taskId?: string) =>
      fetchApi<RepositoryIntelligenceResult>('/repository/intelligence', {
        method: 'POST',
        body: JSON.stringify({ projectId, requirement, taskId }),
      }),
    files: (projectId: string) => fetchApi<RepositoryFile[]>(`/repository/${projectId}/files`),
    graph: (projectId: string) => fetchApi<DependencyGraphResult>(`/repository/${projectId}/graph`),
    startIndexing: (projectId: string) =>
      fetchApi(`/repository/${projectId}/index`, { method: 'POST' }),
  },
  tasks: {
    list: (projectId?: string) =>
      fetchApi<Task[]>(`/tasks${projectId ? `?projectId=${projectId}` : ''}`),
    get: (id: string) => fetchApi<TaskDetail>(`/tasks/${id}`),
    create: (data: CreateTaskInput) =>
      fetchApi<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    upload: (data: { projectId: string; csvContent: string }) =>
      fetchApi<Task[]>('/tasks/upload', { method: 'POST', body: JSON.stringify(data) }),
    recent: (limit = 5) => fetchApi<Task[]>(`/tasks/recent?limit=${limit}`),
    approveAnalysis: (id: string, action: string, comment?: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/approve-analysis`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      }),
    fixLint: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/fix-lint`, { method: 'POST' }),
    approveCode: (id: string, action: string, comment?: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/approve-code`, {
        method: 'POST',
        body: JSON.stringify({ action, comment }),
      }),
    approvePr: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/pr/approve`, { method: 'POST' }),
    mergePr: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/pr/merge`, { method: 'POST' }),
    closePr: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/pr/close`, { method: 'POST' }),
  },
  reports: {
    dashboard: () => fetchApi<DashboardStats>('/reports/dashboard'),
    analytics: () => fetchApi<AnalyticsData>('/reports/analytics'),
    recentPrs: (limit = 5) => fetchApi<PullRequest[]>(`/reports/recent-prs?limit=${limit}`),
  },
};

export interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  defaultBranch: string;
  framework: string;
  language: string;
  description: string;
  status: string;
  filesIndexed: number;
  indexingProgress: number;
  indexingError: string | null;
  githubRepoId: string | null;
  githubOwner: string | null;
  githubRepoName: string | null;
  lastScanAt: string | null;
  createdAt: string;
}

export interface CreateProjectInput {
  name: string;
  repositoryUrl: string;
  defaultBranch?: string;
  framework?: string;
  language?: string;
  description?: string;
  githubRepoId?: string;
  githubOwner?: string;
  githubRepoName?: string;
}

export interface ConnectProjectInput {
  repositoryUrl?: string;
  defaultBranch?: string;
  githubRepoId?: string;
  githubOwner?: string;
  githubRepoName?: string;
}

export interface IndexingStatusResponse {
  project: {
    id: string;
    status: string;
    indexingProgress: number;
    filesIndexed: number;
    indexingError: string | null;
  };
  job: IndexingJob | null;
}

export interface IndexingJob {
  id: string;
  status: string;
  progress: number;
  currentStep: string | null;
  totalFiles: number;
  processedFiles: number;
  errorMessage: string | null;
}

export interface GitLabStatus {
  connected: boolean;
  authType: string | null;
  username: string | null;
  baseUrl: string | null;
  oauthConfigured: boolean;
}

export interface OpenAiKeyStatus {
  configured: boolean;
  source: 'database' | 'env' | null;
  keyPreview: string | null;
}

export interface HuggingFaceKeyStatus {
  configured: boolean;
  source: 'database' | 'env' | null;
  keyPreview: string | null;
  model: string;
  chatModel?: string;
}

export interface EmbeddingStatus {
  provider: 'openai' | 'huggingface';
  model: string;
  dimensions: number;
  openai: OpenAiKeyStatus;
  huggingface: HuggingFaceKeyStatus;
}

export interface GitLabRepo {
  id: number;
  name: string;
  fullName: string;
  namespace: string;
  defaultBranch: string;
  description: string | null;
  visibility: string;
  webUrl: string;
  cloneUrl: string;
}

export interface GitLabBranch {
  name: string;
  protected: boolean;
  default: boolean;
}

export interface SearchResponse {
  results: { file: string; score: number; confidence?: number }[];
}

export interface RepositoryIntelligenceResult {
  relevantFiles: { file: string; score: number; confidence: number }[];
  confidenceScores: { file: string; confidence: number }[];
  dependencyGraph: { source: string; target: string; relationType: string }[];
  adjacencyList: Record<string, string[]>;
  keywords: string[];
}

export interface RepositoryFile {
  id: string;
  filePath: string;
  imports: string[];
  exports: string[];
  functions: string[];
  components: string[];
  hooks: string[];
  contexts: string[];
}

export interface DependencyGraphResult {
  edges: { source: string; target: string; relationType: string }[];
  adjacencyList: Record<string, string[]>;
}

export interface Task {
  id: string;
  taskId: string;
  projectId: string;
  project?: Project;
  requirement: string;
  status: string;
  risk: string;
  assignedAgent: string | null;
  createdAt: string;
}

export interface CreateTaskInput {
  taskId: string;
  projectId: string;
  requirement: string;
}

export interface TaskDetail extends Task {
  acceptanceCriteria: string | null;
  userStories: string[] | null;
  businessImpact: string | null;
  keywords: string[] | null;
  timeline: TimelineEntry[];
  analysis: AnalysisEntry[];
  tests: TestEntry[];
  codeDiffs: CodeDiffEntry[];
  validations: ValidationEntry[];
  pullRequests: PullRequest[];
}

export interface TimelineEntry {
  id: string;
  step: string;
  status: string;
  message: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AnalysisEntry {
  impactedFiles: { path: string; confidence: number }[];
  regressionAreas: string[];
  dependencyGraph: Record<string, string[]> | null;
  apiDependencies: string[];
}

export interface TestEntry {
  functionalTests: { name: string; passed: boolean }[];
  edgeCases: string[];
  regressionCases: string[];
  playwrightSpecs: { filename: string; content: string }[];
  regressionCoverage: number;
}

export interface CodeDiffEntry {
  implementationPlan: string | null;
  filesToModify: { path: string; changes: string[] }[];
  fileEdits?: { path: string; originalContent?: string; newContent: string; changeComments: string[] }[] | null;
  diff: string | null;
  patchContent: string | null;
  approvalStatus: string;
}

export interface ValidationIssue {
  file?: string;
  line?: number;
  column?: number;
  message: string;
  rule?: string;
  tool: string;
  severity?: 'error' | 'warning';
}

export interface ToolValidationResult {
  status: 'pass' | 'fail' | 'skipped';
  command: string;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  output: string;
}

export interface ValidationDetails {
  eslint: ToolValidationResult;
  prettier: ToolValidationResult;
  build: ToolValidationResult;
  tests: {
    status: 'pass' | 'fail' | 'skipped';
    command: string;
    passed: number;
    failed: number;
    results: { name: string; passed: boolean; message?: string; durationMs?: number }[];
    output: string;
  };
  qaSummary: string;
  clonePath: string | null;
  verifiedAt: string;
  fixApplied?: boolean;
}

export interface ValidationEntry {
  lintStatus: string;
  prettierStatus?: string;
  buildStatus: string;
  playwrightPassed: number;
  playwrightFailed: number;
  coverage: number;
  details?: ValidationDetails;
}

export interface PullRequest {
  id: string;
  taskId: string;
  branchName: string;
  commitSha: string | null;
  prUrl: string | null;
  prNumber: number | null;
  reviewStatus: string;
  task?: Task;
}

export interface DashboardStats {
  projects: number;
  tasks: number;
  completedTasks: number;
  pullRequests: number;
  successRate: number;
  agentRuns: number;
  awaitingApproval: number;
  inProgress: number;
  failedTasks: number;
  prCreated: number;
  validationPassRate: number;
  lintFailures: number;
  buildFailures: number;
  indexedProjects: number;
}

export interface AnalyticsData {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  prsCreated: number;
  prCreated: number;
  awaitingApproval: number;
  inProgress: number;
  indexedProjects: number;
  totalProjects: number;
  averageAnalysisTime: number;
  averageValidationTime: number;
  agentSuccessRate: number;
  validationPassRate: number;
  tasksPerDay: { date: string; count: number }[];
  prCreationTrend: { date: string; count: number }[];
  qa: {
    testsPassedTotal: number;
    testsFailedTotal: number;
    averageRegressionCoverage: number;
    functionalTestsTotal: number;
    playwrightSpecsTotal: number;
  };
  validation: {
    eslint: { pass: number; fail: number; skipped: number };
    prettier: { pass: number; fail: number; skipped: number };
    build: { pass: number; fail: number; skipped: number };
    totalRuns: number;
  };
  agentPerformance: { agent: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  taskSummaries: {
    id: string;
    taskId: string;
    projectName: string;
    status: string;
    assignedAgent: string | null;
    risk: string;
    lintStatus: string;
    prettierStatus: string;
    buildStatus: string;
    testsPassed: number;
    testsFailed: number;
    regressionCoverage: number;
    prUrl: string | null;
    prNumber: number | null;
    createdAt: string;
  }[];
}
