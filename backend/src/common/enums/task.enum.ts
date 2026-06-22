export enum TaskStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  APPROVAL_REQUIRED = 'approval_required',
  GENERATING_CODE = 'generating_code',
  TESTING = 'testing',
  PR_CREATED = 'pr_created',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
