export const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  analyzing: 'Analyzing',
  analysis_approval_required: 'Analysis Approval',
  generating_tests: 'Generating Tests',
  generating_code: 'Generating Code',
  code_approval_required: 'Code Approval',
  validating: 'Validating',
  playwright_execution: 'Playwright',
  qa_verification: 'QA Verification',
  security_scan: 'Security Scan',
  creating_pr: 'Creating PR',
  pr_created: 'PR Created',
  completed: 'Completed',
  failed: 'Failed',
  approval_required: 'Approval Required',
  testing: 'Testing',
};

export const TASK_STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'default',
  analyzing: 'info',
  analysis_approval_required: 'warning',
  generating_tests: 'info',
  generating_code: 'primary',
  code_approval_required: 'warning',
  validating: 'secondary',
  playwright_execution: 'info',
  qa_verification: 'secondary',
  security_scan: 'warning',
  creating_pr: 'primary',
  pr_created: 'success',
  completed: 'success',
  failed: 'error',
  approval_required: 'warning',
  testing: 'secondary',
};

export const RISK_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

export const PR_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  approved: 'Approved',
  merged: 'Merged',
  closed: 'Closed',
};

export const PR_STATUS_COLORS: Record<string, 'success' | 'primary' | 'default' | 'info' | 'warning' | 'error'> = {
  open: 'success',
  approved: 'info',
  merged: 'primary',
  closed: 'default',
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  indexing: 'Indexing',
  completed: 'Completed',
  failed: 'Failed',
};

export const PROJECT_STATUS_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'default',
  indexing: 'info',
  completed: 'success',
  failed: 'error',
};

export const TIMELINE_LABELS: Record<string, string> = {
  requirement_analysis: 'Requirement Analysis',
  repository_analysis: 'Repository Analysis',
  impact_analysis: 'Impact Analysis',
  test_generation: 'Test Generation',
  approval: 'Your Approval',
  code_generation: 'Code Generation',
  validation: 'Validation',
  qa: 'QA & Playwright',
  pr: 'GitLab PR',
};

export interface TimelineStepMeta {
  order: number;
  agent: string;
  agentKey: string | null;
  what: string;
}

export const TIMELINE_STEP_META: Record<string, TimelineStepMeta> = {
  requirement_analysis: {
    order: 1,
    agent: 'Requirement Agent',
    agentKey: 'requirement_analysis',
    what: 'AI reads your task and writes acceptance criteria and user stories.',
  },
  repository_analysis: {
    order: 2,
    agent: 'Repository Agent',
    agentKey: 'repository_intelligence',
    what: 'Searches the indexed codebase for files related to your change.',
  },
  impact_analysis: {
    order: 3,
    agent: 'Impact Agent',
    agentKey: 'impact_analysis',
    what: 'Checks which areas might break (dependencies, APIs).',
  },
  test_generation: {
    order: 4,
    agent: 'Test Agent',
    agentKey: 'test_generation',
    what: 'Generates QA test cases for manual review.',
  },
  approval: {
    order: 5,
    agent: 'You (Human)',
    agentKey: null,
    what: 'You approve or reject the analysis and tests before code is written.',
  },
  code_generation: {
    order: 6,
    agent: 'Code Agent',
    agentKey: 'code_generation',
    what: 'AI writes code changes based on the approved plan.',
  },
  validation: {
    order: 7,
    agent: 'Validation Agent',
    agentKey: 'validation',
    what: 'Clones the repo and runs ESLint, Prettier, build, and unit tests.',
  },
  qa: {
    order: 8,
    agent: 'QA Agent',
    agentKey: 'qa',
    what: 'Runs Playwright and regression checks on the changes.',
  },
  pr: {
    order: 9,
    agent: 'GitLab Agent',
    agentKey: 'github',
    what: 'Commits the branch and opens a GitLab Merge Request.',
  },
};

export function timelineAgentForStep(step: string): string {
  return TIMELINE_STEP_META[step]?.agent || '—';
}

export function resolveActiveAgentLabel(
  timeline: { step: string; status: string }[],
  taskStatus: string,
): string {
  const running = timeline.find((s) => s.status === 'running');
  if (running) return `${timelineAgentForStep(running.step)} (working now)`;

  if (taskStatus === 'analysis_approval_required' || taskStatus === 'code_approval_required') {
    return 'Waiting for your approval';
  }

  const failed = [...timeline].reverse().find((s) => s.status === 'failed');
  if (failed) return `Failed at: ${timelineAgentForStep(failed.step)}`;

  if (taskStatus === 'completed' || taskStatus === 'pr_created') return 'GitLab Agent (done)';

  return '—';
}

export const AGENT_LABELS: Record<string, string> = {
  requirement_analysis: 'Requirement Analysis Agent',
  repository_intelligence: 'Repository Intelligence Agent',
  impact_analysis: 'Impact Analysis Agent',
  test_generation: 'Test Generation Agent',
  code_generation: 'Code Generation Agent',
  validation: 'Validation Agent',
  qa: 'QA Agent',
  github: 'GitLab PR Agent',
};

export function agentLabel(agent: string | null | undefined): string {
  if (!agent) return '—';
  return AGENT_LABELS[agent] || capitalize(agent);
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
