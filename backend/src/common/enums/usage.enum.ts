export enum UsageMetricType {
  OPENAI_TOKENS = 'openai_tokens',
  HF_REQUESTS = 'hf_requests',
  EMBEDDING_TOKENS = 'embedding_tokens',
  TASK_EXECUTION = 'task_execution',
  PLAYWRIGHT_RUN = 'playwright_run',
  STORAGE_BYTES = 'storage_bytes',
}

export enum QuotaMetric {
  PROJECTS = 'projects',
  TASKS_PER_MONTH = 'tasksPerMonth',
  TOKENS_PER_MONTH = 'tokensPerMonth',
  STORAGE_MB = 'storageMb',
  USERS = 'users',
  REPOSITORIES = 'repositories',
}
