export const Permission = {
  CREATE_PROJECT: 'create_project',
  CONNECT_REPOSITORY: 'connect_repository',
  APPROVE_ANALYSIS: 'approve_analysis',
  APPROVE_CODE: 'approve_code',
  APPROVE_PR: 'approve_pr',
  MANAGE_BILLING: 'manage_billing',
  MANAGE_USERS: 'manage_users',
  VIEW_ALL: 'view_all',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
