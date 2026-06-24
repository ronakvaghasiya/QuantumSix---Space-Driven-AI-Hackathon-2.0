export enum NotificationEventType {
  ANALYSIS_READY = 'analysis_ready',
  CODE_READY = 'code_ready',
  VALIDATION_FAILED = 'validation_failed',
  SECURITY_SCAN_FAILED = 'security_scan_failed',
  PR_CREATED = 'pr_created',
  MR_READY = 'mr_ready',
  TASK_COMPLETED = 'task_completed',
}

export enum NotificationChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  TEAMS = 'teams',
}

export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  LOGGED = 'logged',
}
