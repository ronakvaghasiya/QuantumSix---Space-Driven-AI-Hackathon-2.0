import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Request, Response } from 'express';
import { SsoService } from './sso.service';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { ConfigService } from '@nestjs/config';

class UpsertSsoProviderDto {
  @ApiProperty({ example: 'google' })
  @IsString()
  provider: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsString()
  clientId: string;

  @ApiProperty()
  @IsString()
  clientSecret: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

@ApiTags('SSO')
@Controller('sso')
export class SsoController {
  constructor(
    private readonly sso: SsoService,
    private readonly config: ConfigService,
  ) {}

  @Get('providers')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List SSO providers for current org' })
  list(@CurrentUser() user: AuthUser) {
    return this.sso.listProviders(user.organizationId);
  }

  @Post('providers')
  @ApiBearerAuth()
  @UseGuards(PermissionsGuard)
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Create or update SSO provider' })
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertSsoProviderDto) {
    return this.sso.upsertProvider(user.organizationId, dto);
  }

  @Public()
  @Get('public/:orgSlug')
  @ApiOperation({ summary: 'Public SSO options for login page' })
  publicProviders(@Param('orgSlug') orgSlug: string) {
    return this.sso.getPublicProviders(orgSlug);
  }

  @Public()
  @Get('authorize')
  @ApiOperation({ summary: 'Redirect to IdP authorization URL' })
  async authorize(
    @Query('providerId') providerId: string,
    @Query('orgSlug') orgSlug: string,
    @Res() res: Response,
  ) {
    const url = await this.sso.buildAuthorizationUrl(providerId, orgSlug);
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'OIDC callback — issues JWT and redirects to frontend' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const result = await this.sso.handleCallback(code, state, ip, req.headers['user-agent']);
    const frontend = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    const redirect = new URL('/login', frontend);
    redirect.searchParams.set('token', result.accessToken);
    redirect.searchParams.set('sso', '1');
    return res.redirect(redirect.toString());
  }
}
