import { OrganizationRole } from '../../common/enums/organization.enum';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: OrganizationRole;
  isSystem?: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  orgId: string;
  role: OrganizationRole;
  jti?: string;
}
