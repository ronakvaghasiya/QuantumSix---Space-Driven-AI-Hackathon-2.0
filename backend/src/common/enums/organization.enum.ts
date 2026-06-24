export enum OrganizationPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum OrganizationRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  DEVELOPER = 'developer',
  QA = 'qa',
  MANAGER = 'manager',
  VIEWER = 'viewer',
}

export enum Permission {
  CREATE_PROJECT = 'create_project',
  CONNECT_REPOSITORY = 'connect_repository',
  APPROVE_ANALYSIS = 'approve_analysis',
  APPROVE_CODE = 'approve_code',
  APPROVE_PR = 'approve_pr',
  MANAGE_BILLING = 'manage_billing',
  MANAGE_USERS = 'manage_users',
  VIEW_ALL = 'view_all',
}
