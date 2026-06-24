import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsageMeterService } from './services/usage-meter.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Usage')
@ApiBearerAuth()
@Controller('usage')
@UseGuards(PermissionsGuard)
export class UsageController {
  constructor(private readonly usage: UsageMeterService) {}

  @Get('current')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Current month usage rollup' })
  current(@CurrentUser() user: AuthUser) {
    return this.usage.getCurrentMonthUsage(user.organizationId);
  }

  @Get('history')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiQuery({ name: 'months', required: false })
  @ApiOperation({ summary: 'Usage history by month' })
  history(@CurrentUser() user: AuthUser, @Query('months') months?: number) {
    return this.usage.getUsageHistory(user.organizationId, months ? Number(months) : 6);
  }
}
