import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationRole } from '../common/enums/organization.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class TenancyService {
  private defaultOrgId: string | null = null;

  constructor(private readonly config: ConfigService) {}

  isAuthEnabled(): boolean {
    return this.config.get('AUTH_ENABLED', 'false') === 'true';
  }

  setDefaultOrganizationId(orgId: string): void {
    this.defaultOrgId = orgId;
  }

  getDefaultOrganizationId(): string | null {
    return this.defaultOrgId;
  }

  resolveOrganizationId(user?: AuthUser | null): string {
    if (user?.organizationId) return user.organizationId;
    if (this.defaultOrgId) return this.defaultOrgId;
    throw new Error('No organization context. Run tenancy bootstrap or enable AUTH.');
  }

  resolveRole(user?: AuthUser | null): OrganizationRole | null {
    return user?.role || null;
  }
}
