import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TenancyService } from '../../tenancy/tenancy.service';
import { AuthUser, JwtPayload } from '../interfaces/auth-user.interface';
import { SessionService } from '../../sessions/session.service';
import { IpRestrictionService } from '../../security/ip-restriction.service';
import { systemAuthUser } from '../system-user';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly tenancy: TenancyService,
    @Optional() private readonly sessions?: SessionService,
    @Optional() private readonly ipRestriction?: IpRestrictionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      user?: AuthUser;
      headers: Record<string, string>;
      ip?: string;
    }>();

    if (!this.tenancy.isAuthEnabled()) {
      request.user = this.systemUser();
      return true;
    }

    const authHeader = request.headers?.authorization || request.headers?.Authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (payload.jti && this.sessions) {
        await this.sessions.assertActive(payload.jti);
      }

      const ip =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        request.ip ||
        '';
      if (this.ipRestriction && payload.orgId && ip) {
        try {
          await this.ipRestriction.assertIpAllowed(payload.orgId, ip);
        } catch (error) {
          if (error instanceof ForbiddenException) throw error;
        }
      }

      request.user = {
        id: payload.sub,
        email: payload.email,
        organizationId: payload.orgId,
        role: payload.role,
        name: payload.email.split('@')[0],
      };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private systemUser(): AuthUser {
    const orgId = this.tenancy.getDefaultOrganizationId();
    if (!orgId) {
      throw new UnauthorizedException('Tenancy not bootstrapped');
    }
    return systemAuthUser(orgId);
  }
}
