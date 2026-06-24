import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { Permission } from '../../common/enums/organization.enum';
import { TenancyService } from '../../tenancy/tenancy.service';
import { AuthUser } from '../../auth/interfaces/auth-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbac: RbacService,
    private readonly tenancy: TenancyService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.tenancy.isAuthEnabled()) return true;

    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const role = request.user?.role;
    if (!role) throw new ForbiddenException('No role in context');

    const allowed = required.some((p) => this.rbac.hasPermission(role, p));
    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${required.join(', ')}`);
    }
    return true;
  }
}
