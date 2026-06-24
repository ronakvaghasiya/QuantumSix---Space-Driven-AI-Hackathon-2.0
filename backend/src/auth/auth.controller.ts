import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, SwitchOrganizationDto } from './dto/auth.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './interfaces/auth-user.interface';
import { TenancyService } from '../tenancy/tenancy.service';

function requestContext(req: Request) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
  return { ipAddress: ip, userAgent: req.headers['user-agent'] };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenancy: TenancyService,
  ) {}

  @Public()
  @Get('config')
  @ApiOperation({ summary: 'Auth configuration (public)' })
  config() {
    return { authEnabled: this.tenancy.isAuthEnabled() };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register user and create organization' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, requestContext(req));
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, requestContext(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and permissions' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getProfile(user.id, user.organizationId);
  }

  @Post('switch-organization')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch active organization (new JWT)' })
  switchOrg(@CurrentUser() user: AuthUser, @Body() dto: SwitchOrganizationDto, @Req() req: Request) {
    return this.authService.switchOrganization(user.id, dto.organizationId, requestContext(req));
  }
}
