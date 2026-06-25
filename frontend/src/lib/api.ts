export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

import { getToken, type AuthUser, type PlatformRuntime } from './auth';

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
  clientPlatform?: string;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  clientPlatform?: string;
}

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
  const token = typeof window !== 'undefined' ? getToken() : null;
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
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
  auth: {
    login: (data: LoginInput) =>
      fetchApi<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    register: (data: RegisterInput) =>
      fetchApi<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => fetchApi<AuthUser>('/auth/me'),
  },
  platform: {
    runtime: () => fetchApi<PlatformRuntime>('/platform/runtime'),
  },
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
    syncFromEnv: () => fetchApi('/gitlab/sync-env', { method: 'POST' }),
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
  memory: {
    snapshots: (projectId: string) =>
      fetchApi<MemorySnapshot[]>(`/memory/projects/${projectId}/snapshots`),
    retrieve: (projectId: string, requirement: string, limit = 8) =>
      fetchApi<MemoryRetrieveResult>('/memory/retrieve', {
        method: 'POST',
        body: JSON.stringify({ projectId, requirement, limit }),
      }),
    taskMemories: (projectId: string) =>
      fetchApi<TaskMemoryEntry[]>(`/memory/projects/${projectId}/tasks`),
    similarForTask: (taskId: string, limit = 5) =>
      fetchApi<SimilarTaskResult[]>(`/memory/tasks/${taskId}/similar?limit=${limit}`),
    reindexEvents: (projectId: string) =>
      fetchApi<ReindexEvent[]>(`/memory/projects/${projectId}/reindex-events`),
  },
  risk: {
    get: (taskId: string) => fetchApi<RiskAssessment | null>(`/risk/tasks/${taskId}`),
    assess: (taskId: string) =>
      fetchApi<RiskAssessment>(`/risk/tasks/${taskId}/assess`, { method: 'POST' }),
    projectSummary: (projectId: string) =>
      fetchApi<ProjectRiskSummary>(`/risk/projects/${projectId}/summary`),
  },
  knowledgeGraph: {
    get: (projectId: string) =>
      fetchApi<KnowledgeGraphResult>(`/knowledge-graph/projects/${projectId}`),
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
    approveAnalysis: (id: string, action: string, comment?: string, reason?: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/approve-analysis`, {
        method: 'POST',
        body: JSON.stringify({ action, comment, reason }),
      }),
    fixLint: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/fix-lint`, { method: 'POST' }),
    retryPr: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/retry-pr`, { method: 'POST' }),
    retryCodegen: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/retry-codegen`, { method: 'POST' }),
    revertCode: (id: string, paths?: string[]) =>
      fetchApi<TaskDetail>(`/tasks/${id}/revert-code`, {
        method: 'POST',
        body: JSON.stringify({ paths }),
      }),
    restart: (id: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/restart`, { method: 'POST' }),
    restartByTaskId: (taskId: string) =>
      fetchApi<TaskDetail>(`/tasks/by-task-id/${encodeURIComponent(taskId)}/restart`, { method: 'POST' }),
    delete: (id: string) =>
      fetchApi<{ deleted: boolean; taskId: string }>(`/tasks/${id}`, { method: 'DELETE' }),
    deleteByTaskId: (taskId: string) =>
      fetchApi<{ deleted: boolean; taskId: string }>(`/tasks/by-task-id/${encodeURIComponent(taskId)}`, { method: 'DELETE' }),
    approveCode: (id: string, action: string, comment?: string, reason?: string) =>
      fetchApi<TaskDetail>(`/tasks/${id}/approve-code`, {
        method: 'POST',
        body: JSON.stringify({ action, comment, reason }),
      }),
    audit: (id: string) => fetchApi<AuditLogEntry[]>(`/tasks/${id}/audit`),
    feedback: (id: string) => fetchApi<TaskFeedbackEntry[]>(`/tasks/${id}/feedback`),
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
  aiProvider?: string;
  aiModel?: string | null;
  aiTemperature?: number;
  aiMaxTokens?: number;
  vcsProvider?: string;
  lastCommitSha?: string | null;
  autoReindexEnabled?: boolean;
  lastReindexAt?: string | null;
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
  aiProvider?: 'openai' | 'huggingface';
  aiModel?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
  vcsProvider?: string;
  autoReindexEnabled?: boolean;
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
  envTokenConfigured?: boolean;
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

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  actor: string;
  action: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskFeedbackEntry {
  id: string;
  gate: string;
  action: string;
  reason: string | null;
  comments: string | null;
  createdAt: string;
}

export interface QaTestCaseEntry {
  id: string;
  title: string;
  category: string;
  priority: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  actualResult?: string;
  status: string;
  relatedFiles?: string[];
  linkedRequirement?: string;
  verificationMethod?: string;
}

export interface TestEntry {
  functionalTests: { name: string; passed: boolean }[];
  edgeCases: string[];
  regressionCases: string[];
  playwrightSpecs: { filename: string; content: string }[];
  regressionCoverage: number;
  qaTestCases?: QaTestCaseEntry[] | null;
  qaSummary?: string | null;
  qaVerifiedAt?: string | null;
  qaGeneratedAt?: string | null;
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

export interface MemorySnapshot {
  id: string;
  projectId: string;
  commitSha: string | null;
  branch: string | null;
  filesCount: number;
  chunksCount: number;
  summary: string | null;
  metadata?: { incremental?: boolean; full?: boolean; trigger?: string };
  createdAt: string;
}

export interface MemoryRetrieveResult {
  snapshots: MemorySnapshot[];
  semanticMatches: { filePath: string; score: number; chunkText: string }[];
}

export interface TaskMemoryEntry {
  id: string;
  taskId: string;
  requirement: string;
  outcome: string;
  riskLevel: string | null;
  impactedFiles: string[];
  createdAt: string;
}

export interface SimilarTaskResult {
  taskId: string;
  taskDisplayId?: string;
  requirement: string;
  outcome: string;
  riskLevel: string | null;
  score: number;
  similarity: number;
  impactedFiles: string[];
}

export interface ReindexEvent {
  id: string;
  projectId: string;
  triggerSource: string;
  branch: string | null;
  commitSha: string | null;
  changedFiles: string[];
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface RiskFactors {
  llmRisk: number;
  impactedFiles: number;
  dependencyDepth: number;
  securityExposure: number;
  similarTaskFailureRate: number;
  details?: Record<string, unknown>;
}

export interface RiskAssessment {
  id: string;
  taskId: string;
  overallScore: number;
  riskLevel: string;
  factors: RiskFactors;
  summary: string | null;
  computedAt: string;
}

export interface ProjectRiskSummary {
  averageScore: number;
  highRiskCount: number;
  totalAssessed: number;
  distribution: Record<string, number>;
}

export interface KnowledgeGraphNode {
  id: string;
  type: 'file' | 'task' | 'test';
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface KnowledgeGraphResult {
  nodes: KnowledgeGraphNode[];
  edges: { id: string; source: string; target: string; type?: string; label?: string }[];
  stats: { files: number; tasks: number; tests: number; relations: number };
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
  organizationName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  organizationId?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name: string; organizationId: string; role: string };
  organization: OrganizationSummary | null;
  permissions: string[];
}

export interface AuthProfile {
  user: { id: string; email: string; name: string };
  organization: OrganizationSummary | null;
  role: string;
  permissions: string[];
  organizations: OrganizationSummary[];
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  plan?: string;
  role?: string;
}

export interface OrganizationMember {
  id: string;
  role: string;
  user: { id: string; email: string; name: string };
}

export interface InviteMemberInput {
  email: string;
  role: string;
  name?: string;
}

export interface PlanLimits {
  projects: number;
  repositories: number;
  tasksPerMonth: number;
  storageMb: number;
  users: number;
  tokensPerMonth: number;
}

export interface BillingSubscription {
  status: string;
  plan: {
    code: string;
    name: string;
    priceMonthlyCents: number;
    limits: PlanLimits;
  };
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
}

export interface QuotaItem {
  metric: string;
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
}

export interface BillingQuotaSummary {
  plan: BillingSubscription['plan'];
  quotas: QuotaItem[];
}

export interface UsageMetricRow {
  id?: string;
  organizationId?: string;
  year: number;
  month: number;
  tokensUsed: number;
  requestsUsed: number;
  tasksProcessed: number;
  storageUsed: number;
  playwrightRuns: number;
}

export interface ProjectedCost {
  currency: string;
  baseMonthly: number;
  projectedOverage: number;
  projectedTotal: number;
  note: string;
}

export interface AiReviewFinding {
  category: 'bug' | 'performance' | 'security' | 'testing' | 'smell';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  filePath?: string;
}

export interface AiReview {
  id: string;
  taskId: string;
  overallScore: number;
  findings: AiReviewFinding[];
  summary: string | null;
  createdAt: string;
}

export interface NotificationChannel {
  id: string;
  organizationId: string;
  type: 'email' | 'slack' | 'teams';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationChannelInput {
  type: 'email' | 'slack' | 'teams';
  name: string;
  config: Record<string, unknown>;
  enabled?: boolean;
  events?: string[];
}

export interface NotificationDelivery {
  id: string;
  eventType: string;
  channelType: string;
  status: string;
  subject: string | null;
  body: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface RiskTrendPoint {
  date: string;
  averageScore: number;
  assessments: number;
  highRiskCount: number;
}

export interface RepositoryHealthItem {
  projectId: string;
  projectName: string;
  status: string;
  healthScore: number;
  filesIndexed: number;
  indexingProgress: number;
  lastScanAt: string | null;
  lastReindexAt: string | null;
  indexingError: string | null;
  taskSuccessRate: number;
  avgRiskScore: number;
  validationPassRate: number;
  recentReindexes: number;
}

export interface EngineeringDashboard {
  summary: {
    projects: number;
    indexedProjects: number;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    mergedReleases: number;
    avgRiskScore: number;
    validationPassRate: number;
    taskSuccessRate: number;
  };
  riskTrends: RiskTrendPoint[];
  repositoryHealth: RepositoryHealthItem[];
  tasksPerDay: { date: string; count: number }[];
  releasesPerWeek: { week: string; count: number }[];
  riskDistribution: Record<string, number>;
  recentReleases: Array<{
    id: string;
    versionTag: string;
    projectName: string;
    taskId: string | null;
    createdAt: string;
  }>;
}

export interface ReleaseChangelogEntry {
  type: string;
  description: string;
  taskId?: string;
  filePath?: string;
}

export interface Release {
  id: string;
  organizationId: string;
  projectId: string;
  taskId: string | null;
  versionTag: string;
  mergeCommitSha: string | null;
  releaseNotes: string | null;
  sprintSummary: string | null;
  changelog: ReleaseChangelogEntry[];
  impactSummary: Record<string, unknown>;
  riskSummary: Record<string, unknown>;
  createdAt: string;
  project?: { id: string; name: string };
  task?: { id: string; taskId: string };
}

export interface VaultSecretSummary {
  id: string;
  keyName: string;
  keyVersion: number;
  preview: string;
  updatedAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  organizationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface SsoProviderSummary {
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  clientId?: string | null;
  hasClientSecret?: boolean;
  issuer?: string | null;
}

export interface UpsertSsoProviderInput {
  provider: string;
  name?: string;
  clientId: string;
  clientSecret: string;
  issuer?: string;
  enabled?: boolean;
}

export interface IpAllowlistRule {
  id: string;
  organizationId: string;
  cidr: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface RepositoryAccessLogEntry {
  id: string;
  organizationId: string;
  projectId: string | null;
  action: string;
  actorId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApprovalGatesConfig {
  analysis: boolean;
  code: boolean;
  pr: boolean;
  riskAutoApproveMaxScore?: number | null;
}

export interface ValidationRulesConfig {
  blockOnLintFail: boolean;
  blockOnSecurityScan: boolean;
  minRegressionCoverage?: number;
}

export interface WorkflowConfig {
  id: string;
  organizationId: string;
  approvalGates: ApprovalGatesConfig;
  validationRules: ValidationRulesConfig;
  agentOrder: { disabledSteps?: string[] };
  notificationRules: { mutedEvents?: string[] };
}

export interface WorkflowConfigUpdate {
  approvalGates?: Partial<ApprovalGatesConfig>;
  validationRules?: Partial<ValidationRulesConfig>;
  agentOrder?: { disabledSteps?: string[] };
  notificationRules?: { mutedEvents?: string[] };
}

export interface PluginCatalogItem {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  manifest: Record<string, unknown>;
}

export interface PluginInstallation {
  id: string;
  organizationId: string;
  pluginId: string;
  config: Record<string, unknown>;
  enabled: boolean;
  installedAt: string;
  plugin?: PluginCatalogItem;
}

