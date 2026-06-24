import { OrganizationRole } from '../common/enums/organization.enum';
import { AuthUser } from './interfaces/auth-user.interface';

export const SYSTEM_USER_ID = 'system';

export function isSystemUser(userId: string): boolean {
  return userId === SYSTEM_USER_ID;
}

export function systemAuthUser(organizationId: string): AuthUser {
  return {
    id: SYSTEM_USER_ID,
    email: 'system@repopilot.local',
    name: 'System',
    organizationId,
    role: OrganizationRole.ORG_ADMIN,
    isSystem: true,
  };
}
