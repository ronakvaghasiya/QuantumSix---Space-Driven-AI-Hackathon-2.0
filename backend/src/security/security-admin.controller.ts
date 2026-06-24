import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IpRestrictionService } from './ip-restriction.service';
import { RepositoryAccessLogService } from './repository-access-log.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

class AddIpRuleDto {
  @ApiProperty({ example: '203.0.113.0/24' })
  @IsString()
  cidr: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;
}

@ApiTags('Security')
@ApiBearerAuth()
@Controller('security')
@UseGuards(PermissionsGuard)
export class SecurityAdminController {
  constructor(
    private readonly ipRestriction: IpRestrictionService,
    private readonly accessLog: RepositoryAccessLogService,
  ) {}

  @Get('ip-allowlist')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List IP allowlist rules (Enterprise)' })
  listIp(@CurrentUser() user: AuthUser) {
    return this.ipRestriction.list(user.organizationId);
  }

  @Post('ip-allowlist')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Add IP allowlist rule' })
  addIp(@CurrentUser() user: AuthUser, @Body() dto: AddIpRuleDto) {
    return this.ipRestriction.add(user.organizationId, dto.cidr, dto.label);
  }

  @Delete('ip-allowlist/:id')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Remove IP allowlist rule' })
  async removeIp(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.ipRestriction.remove(user.organizationId, id);
    return { ok: true };
  }

  @Get('repository-access-logs')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Repository access audit trail' })
  accessLogs(@CurrentUser() user: AuthUser) {
    return this.accessLog.list(user.organizationId);
  }
}
