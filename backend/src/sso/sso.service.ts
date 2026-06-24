import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { SsoProvider } from './entities/sso-provider.entity';
import { SsoIdentity } from './entities/sso-identity.entity';
import { User } from '../auth/entities/user.entity';
import { OrganizationMember } from '../organizations/entities/organization-member.entity';
import { SSO_PRESETS, SsoProviderType } from './sso.constants';
import { OrganizationRole } from '../common/enums/organization.enum';
import { JwtService } from '@nestjs/jwt';
import { SessionService } from '../sessions/session.service';
import { RbacService } from '../rbac/rbac.service';
import { JwtPayload } from '../auth/interfaces/auth-user.interface';

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
}

interface OidcUserInfo {
  sub: string;
  email?: string;
  name?: string;
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);
  private readonly discoveryCache = new Map<string, OidcDiscovery>();

  constructor(
    @InjectRepository(SsoProvider) private readonly providerRepo: Repository<SsoProvider>,
    @InjectRepository(SsoIdentity) private readonly identityRepo: Repository<SsoIdentity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMember) private readonly memberRepo: Repository<OrganizationMember>,
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly rbac: RbacService,
  ) {}

  async listProviders(organizationId: string) {
    const providers = await this.providerRepo.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });
    return providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      name: p.name,
      enabled: p.enabled,
      clientId: p.config.clientId || null,
      hasClientSecret: Boolean(p.config.clientSecret),
      issuer: p.config.issuer || SSO_PRESETS[p.provider]?.issuer || null,
    }));
  }

  async upsertProvider(
    organizationId: string,
    data: {
      provider: string;
      name?: string;
      clientId: string;
      clientSecret: string;
      issuer?: string;
      enabled?: boolean;
    },
  ): Promise<SsoProvider> {
    const preset = SSO_PRESETS[data.provider];
    const issuer = data.issuer || preset?.issuer;
    if (!issuer) throw new BadRequestException('issuer is required for custom OIDC');

    let provider = await this.providerRepo.findOne({
      where: { organizationId, provider: data.provider },
    });

    const config = {
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      issuer,
      scopes: preset?.scopes || 'openid email profile',
    };

    if (provider) {
      provider.name = data.name || provider.name;
      provider.config = { ...provider.config, ...config };
      if (data.enabled !== undefined) provider.enabled = data.enabled;
    } else {
      provider = this.providerRepo.create({
        organizationId,
        provider: data.provider,
        name: data.name || preset?.name || data.provider,
        config,
        enabled: data.enabled ?? true,
      });
    }
    return this.providerRepo.save(provider);
  }

  async getPublicProviders(organizationSlug: string) {
    const providers = await this.providerRepo
      .createQueryBuilder('p')
      .innerJoin('p.organization', 'org')
      .where('org.slug = :slug', { slug: organizationSlug })
      .andWhere('p.enabled = true')
      .getMany();

    return providers.map((p) => ({
      id: p.id,
      provider: p.provider,
      name: p.name,
    }));
  }

  async buildAuthorizationUrl(providerId: string, organizationSlug: string): Promise<string> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId, enabled: true },
      relations: ['organization'],
    });
    if (!provider || provider.organization.slug !== organizationSlug) {
      throw new NotFoundException('SSO provider not found');
    }

    const discovery = await this.discover(provider.config.issuer as string);
    const state = Buffer.from(
      JSON.stringify({
        providerId: provider.id,
        nonce: randomBytes(16).toString('hex'),
      }),
    ).toString('base64url');

    const redirectUri = this.callbackUrl();
    const params = new URLSearchParams({
      client_id: String(provider.config.clientId),
      response_type: 'code',
      scope: String(provider.config.scopes || 'openid email profile'),
      redirect_uri: redirectUri,
      state,
    });

    return `${discovery.authorization_endpoint}?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let parsed: { providerId: string };
    try {
      parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid state');
    }

    const provider = await this.providerRepo.findOne({
      where: { id: parsed.providerId, enabled: true },
      relations: ['organization'],
    });
    if (!provider) throw new NotFoundException('SSO provider not found');

    const discovery = await this.discover(provider.config.issuer as string);
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.callbackUrl(),
        client_id: String(provider.config.clientId),
        client_secret: String(provider.config.clientSecret),
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      this.logger.warn(`SSO token exchange failed: ${err}`);
      throw new UnauthorizedException('SSO token exchange failed');
    }

    const tokens = (await tokenRes.json()) as { access_token: string };
    const userInfo = await this.fetchUserInfo(discovery, tokens.access_token);
    if (!userInfo.email) throw new UnauthorizedException('Email not provided by IdP');

    const user = await this.resolveUser(provider, userInfo);
    const membership = await this.memberRepo.findOne({
      where: { userId: user.id, organizationId: provider.organizationId },
    });
    if (!membership) {
      await this.memberRepo.save(
        this.memberRepo.create({
          userId: user.id,
          organizationId: provider.organizationId,
          role: OrganizationRole.VIEWER,
          joinedAt: new Date(),
        }),
      );
    }

    const role =
      membership?.role ||
      (await this.memberRepo.findOne({
        where: { userId: user.id, organizationId: provider.organizationId },
      }))!.role;

    const jti = randomBytes(16).toString('hex');
    const expiresIn = this.config.get('JWT_EXPIRES_IN', '7d');
    const expiresAt = this.parseExpiry(expiresIn);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: provider.organizationId,
      role,
      jti,
    };

    await this.sessions.createSession({
      userId: user.id,
      organizationId: provider.organizationId,
      jti,
      expiresAt,
      ipAddress,
      userAgent,
    });

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        organizationId: provider.organizationId,
        role,
      },
      organization: {
        id: provider.organization.id,
        name: provider.organization.name,
        slug: provider.organization.slug,
        plan: provider.organization.plan,
      },
      permissions: this.rbac.getPermissions(role),
    };
  }

  private async resolveUser(provider: SsoProvider, info: OidcUserInfo): Promise<User> {
    let identity = await this.identityRepo.findOne({
      where: { providerId: provider.id, externalId: info.sub },
      relations: ['user'],
    });
    if (identity?.user) return identity.user;

    let user = await this.userRepo.findOne({ where: { email: info.email!.toLowerCase() } });
    if (!user) {
      user = await this.userRepo.save(
        this.userRepo.create({
          email: info.email!.toLowerCase(),
          name: info.name || info.email!.split('@')[0],
          passwordHash: null,
        }),
      );
    }

    await this.identityRepo.save(
      this.identityRepo.create({
        userId: user.id,
        providerId: provider.id,
        externalId: info.sub,
        metadata: { email: info.email, name: info.name },
      }),
    );

    return user;
  }

  private async discover(issuer: string): Promise<OidcDiscovery> {
    const cached = this.discoveryCache.get(issuer);
    if (cached) return cached;

    const url = issuer.endsWith('/') ? `${issuer}.well-known/openid-configuration` : `${issuer}/.well-known/openid-configuration`;
    const res = await fetch(url);
    if (!res.ok) throw new BadRequestException(`OIDC discovery failed for ${issuer}`);
    const doc = (await res.json()) as OidcDiscovery;
    this.discoveryCache.set(issuer, doc);
    return doc;
  }

  private async fetchUserInfo(discovery: OidcDiscovery, accessToken: string): Promise<OidcUserInfo> {
    if (!discovery.userinfo_endpoint) {
      throw new BadRequestException('IdP does not expose userinfo endpoint');
    }
    const res = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new UnauthorizedException('Failed to fetch user info');
    return res.json() as Promise<OidcUserInfo>;
  }

  private callbackUrl(): string {
    const api = this.config.get('API_PUBLIC_URL') || 'http://localhost:3001/api/v1';
    return `${api.replace(/\/$/, '')}/sso/callback`;
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
}
