import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './services/billing.service';
import { UsageMeterService } from '../usage/services/usage-meter.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

class UpgradePlanDto {
  @ApiProperty({ example: 'pro' })
  @IsString()
  planCode: string;
}

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
@UseGuards(PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly usageMeter: UsageMeterService,
  ) {}

  @Get('subscription')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Current subscription and plan' })
  subscription(@CurrentUser() user: AuthUser) {
    return this.billing.getSubscription(user.organizationId);
  }

  @Get('usage')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Current month usage metrics' })
  getUsage(@CurrentUser() user: AuthUser) {
    return this.usageMeter.getCurrentMonthUsage(user.organizationId);
  }

  @Get('quota')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Quota usage vs plan limits' })
  quota(@CurrentUser() user: AuthUser) {
    return this.billing.getQuotaSummary(user.organizationId);
  }

  @Get('projected-cost')
  @RequirePermission(Permission.MANAGE_BILLING)
  @ApiOperation({ summary: 'Projected monthly cost including overage estimate' })
  projectedCost(@CurrentUser() user: AuthUser) {
    return this.billing.getProjectedCost(user.organizationId);
  }

  @Post('upgrade')
  @RequirePermission(Permission.MANAGE_BILLING)
  @ApiOperation({ summary: 'Upgrade organization plan (stub — no Stripe yet)' })
  upgrade(@CurrentUser() user: AuthUser, @Body() dto: UpgradePlanDto) {
    return this.billing.upgradePlan(user.organizationId, dto.planCode);
  }
}
