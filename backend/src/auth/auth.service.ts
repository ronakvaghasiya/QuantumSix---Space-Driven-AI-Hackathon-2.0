import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { OrganizationRole } from '../common/enums/organization.enum';
import { JwtPayload, AuthUser } from './interfaces/auth-user.interface';
import { RbacService } from '../rbac/rbac.service';
import { SessionService } from '../sessions/session.service';
import { isSystemUser, SYSTEM_USER_ID } from './system-user';

export interface AuthRequestContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Organization) private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMember) private readonly memberRepo: Repository<OrganizationMember>,
    private readonly jwtService: JwtService,
    private readonly rbac: RbacService,
    private readonly config: ConfigService,
    @Optional() private readonly sessions?: SessionService,
  ) {}

  async register(dto: RegisterDto, ctx: AuthRequestContext = {}) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
      }),
    );

    const slug = this.slugify(dto.organizationName);
    const org = await this.orgRepo.save(
      this.orgRepo.create({
        name: dto.organizationName,
        slug: await this.uniqueSlug(slug),
      }),
    );

    await this.memberRepo.save(
      this.memberRepo.create({
        organizationId: org.id,
        userId: user.id,
        role: OrganizationRole.ORG_ADMIN,
        joinedAt: new Date(),
      }),
    );

    return this.buildAuthResponse(user, org.id, OrganizationRole.ORG_ADMIN, ctx);
  }

  async login(dto: LoginDto, ctx: AuthRequestContext = {}) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['memberships', 'memberships.organization'],
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const membership = dto.organizationId
      ? user.memberships?.find((m) => m.organizationId === dto.organizationId)
      : user.memberships?.[0];

    if (!membership) throw new UnauthorizedException('No organization membership found');

    return this.buildAuthResponse(user, membership.organizationId, membership.role, ctx);
  }

  async switchOrganization(userId: string, organizationId: string, ctx: AuthRequestContext = {}) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const membership = await this.memberRepo.findOne({
      where: { userId, organizationId },
    });
    if (!membership) throw new UnauthorizedException('Not a member of this organization');

    return this.buildAuthResponse(user, membership.organizationId, membership.role, ctx);
  }

  async getProfile(userId: string, organizationId: string) {
    if (isSystemUser(userId)) {
      const org = await this.orgRepo.findOne({ where: { id: organizationId } });
      const role = OrganizationRole.ORG_ADMIN;
      return {
        user: {
          id: SYSTEM_USER_ID,
          email: 'system@repopilot.local',
          name: 'System',
        },
        organization: org
          ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan }
          : null,
        role,
        permissions: this.rbac.getPermissions(role),
        organizations: org
          ? [{ id: org.id, name: org.name, slug: org.slug, role }]
          : [],
      };
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['memberships', 'memberships.organization'],
    });
    if (!user) throw new NotFoundException('User not found');

    const membership = user.memberships?.find((m) => m.organizationId === organizationId);
    if (!membership) {
      throw new UnauthorizedException('Not a member of current organization');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: membership?.organization
        ? { id: membership.organization.id, name: membership.organization.name, slug: membership.organization.slug, plan: membership.organization.plan }
        : null,
      role: membership?.role || OrganizationRole.ORG_ADMIN,
      permissions: this.rbac.getPermissions(membership?.role || OrganizationRole.ORG_ADMIN),
      organizations: (user.memberships || []).map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  private async buildAuthResponse(
    user: User,
    orgId: string,
    role: OrganizationRole,
    ctx: AuthRequestContext = {},
  ) {
    const jti = randomBytes(16).toString('hex');
    const expiresIn = this.config.get('JWT_EXPIRES_IN', '7d');
    const expiresAt = this.parseExpiry(expiresIn);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      role,
      jti,
    };
    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    await this.sessions?.createSession({
      userId: user.id,
      organizationId: orgId,
      jti,
      expiresAt,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    const org = await this.orgRepo.findOne({ where: { id: orgId } });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: orgId,
        role,
      },
      organization: org
        ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan }
        : null,
      permissions: this.rbac.getPermissions(role),
    };
  }

  private parseExpiry(expiresIn: string): Date {
    const match = /^(\d+)([dhms])$/.exec(expiresIn);
    const now = Date.now();
    if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000);
    const n = Number(match[1]);
    const unit = match[2];
    const mult = unit === 'd' ? 86400000 : unit === 'h' ? 3600000 : unit === 'm' ? 60000 : 1000;
    return new Date(now + n * mult);
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'org';
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let i = 1;
    while (await this.orgRepo.findOne({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
    return slug;
  }
}
