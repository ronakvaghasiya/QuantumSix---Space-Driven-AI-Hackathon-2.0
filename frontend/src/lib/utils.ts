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
  approval: 'Approval',
  code_generation: 'Code Generation',
  validation: 'Validation',
  qa: 'QA',
  pr: 'PR',
};

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
