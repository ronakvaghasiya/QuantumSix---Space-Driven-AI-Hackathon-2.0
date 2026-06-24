import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('engineering')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Engineering analytics dashboard for current org' })
  engineering(@CurrentUser() user: AuthUser) {
    return this.analytics.getEngineeringDashboard(user.organizationId);
  }

  @Get('risk-trends')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Risk score trends over time' })
  riskTrends(@CurrentUser() user: AuthUser, @Query('days') days?: number) {
    return this.analytics.getRiskTrends(user.organizationId, days ? Number(days) : 30);
  }

  @Get('repository-health')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Per-project repository health scores' })
  repositoryHealth(@CurrentUser() user: AuthUser) {
    return this.analytics.getRepositoryHealth(user.organizationId);
  }
}
