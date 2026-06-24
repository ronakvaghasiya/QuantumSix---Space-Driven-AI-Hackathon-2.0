import { Injectable } from '@nestjs/common';
import { OrganizationRole, Permission } from '../common/enums/organization.enum';

const ROLE_PERMISSIONS: Record<OrganizationRole, Permission[]> = {
  [OrganizationRole.SUPER_ADMIN]: Object.values(Permission),
  [OrganizationRole.ORG_ADMIN]: [
    Permission.CREATE_PROJECT,
    Permission.CONNECT_REPOSITORY,
    Permission.APPROVE_ANALYSIS,
    Permission.APPROVE_CODE,
    Permission.APPROVE_PR,
    Permission.MANAGE_BILLING,
    Permission.MANAGE_USERS,
    Permission.VIEW_ALL,
  ],
  [OrganizationRole.DEVELOPER]: [
    Permission.CREATE_PROJECT,
    Permission.CONNECT_REPOSITORY,
    Permission.APPROVE_CODE,
    Permission.VIEW_ALL,
  ],
  [OrganizationRole.QA]: [Permission.APPROVE_ANALYSIS, Permission.VIEW_ALL],
  [OrganizationRole.MANAGER]: [
    Permission.CREATE_PROJECT,
    Permission.CONNECT_REPOSITORY,
    Permission.APPROVE_ANALYSIS,
    Permission.APPROVE_CODE,
    Permission.APPROVE_PR,
    Permission.VIEW_ALL,
  ],
  [OrganizationRole.VIEWER]: [Permission.VIEW_ALL],
};

@Injectable()
export class RbacService {
  hasPermission(role: OrganizationRole, permission: Permission): boolean {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes(permission);
  }

  getPermissions(role: OrganizationRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}
