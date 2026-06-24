export enum TaskStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  ANALYSIS_APPROVAL_REQUIRED = 'analysis_approval_required',
  GENERATING_TESTS = 'generating_tests',
  GENERATING_CODE = 'generating_code',
  CODE_APPROVAL_REQUIRED = 'code_approval_required',
  VALIDATING = 'validating',
  PLAYWRIGHT_EXECUTION = 'playwright_execution',
  QA_VERIFICATION = 'qa_verification',
  SECURITY_SCAN = 'security_scan',
  CREATING_PR = 'creating_pr',
  PR_CREATED = 'pr_created',
  COMPLETED = 'completed',
  FAILED = 'failed',
  /** @deprecated use analysis_approval_required or code_approval_required */
  APPROVAL_REQUIRED = 'approval_required',
  /** @deprecated use validating */
  TESTING = 'testing',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AgentType {
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  REPOSITORY_INTELLIGENCE = 'repository_intelligence',
  IMPACT_ANALYSIS = 'impact_analysis',
  TEST_GENERATION = 'test_generation',
  CODE_GENERATION = 'code_generation',
  VALIDATION = 'validation',
  QA = 'qa',
  GITHUB = 'github',
}

export enum TimelineStep {
  REQUIREMENT_ANALYSIS = 'requirement_analysis',
  REPOSITORY_ANALYSIS = 'repository_analysis',
  IMPACT_ANALYSIS = 'impact_analysis',
  TEST_GENERATION = 'test_generation',
  APPROVAL = 'approval',
  CODE_GENERATION = 'code_generation',
  VALIDATION = 'validation',
  QA = 'qa',
  PR = 'pr',
}

export enum TimelineStepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}
