import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('export')
  @RequirePermission(Permission.MANAGE_USERS)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-export.csv"')
  @ApiOperation({ summary: 'Export organization audit logs as CSV' })
  async exportCsv(
    @CurrentUser() user: AuthUser,
    @Query('days') days?: number,
  ): Promise<string> {
    return this.audit.exportCsv(user.organizationId, days ? Number(days) : 90);
  }

  @Get('logs')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List organization audit logs' })
  list(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.audit.findByOrganization(user.organizationId, limit ? Number(limit) : 200);
  }
}
