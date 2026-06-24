import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { WorkflowConfigService } from './workflow-config.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

class ApprovalGatesDto {
  @IsOptional() @IsBoolean() analysis?: boolean;
  @IsOptional() @IsBoolean() code?: boolean;
  @IsOptional() @IsBoolean() pr?: boolean;
  @IsOptional() @IsNumber() riskAutoApproveMaxScore?: number | null;
}

class ValidationRulesDto {
  @IsOptional() @IsBoolean() blockOnLintFail?: boolean;
  @IsOptional() @IsBoolean() blockOnSecurityScan?: boolean;
  @IsOptional() @IsNumber() minRegressionCoverage?: number;
}

class UpdateWorkflowConfigDto {
  @IsOptional() @ValidateNested() @Type(() => ApprovalGatesDto) approvalGates?: ApprovalGatesDto;
  @IsOptional() @ValidateNested() @Type(() => ValidationRulesDto) validationRules?: ValidationRulesDto;
  @IsOptional() @IsObject() agentOrder?: Record<string, unknown>;
  @IsOptional() @IsObject() notificationRules?: Record<string, unknown>;
}

@ApiTags('Workflow')
@ApiBearerAuth()
@Controller('workflow-config')
@UseGuards(PermissionsGuard)
export class WorkflowConfigController {
  constructor(private readonly workflow: WorkflowConfigService) {}

  @Get()
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Get organization workflow configuration' })
  get(@CurrentUser() user: AuthUser) {
    return this.workflow.getForOrganization(user.organizationId);
  }

  @Put()
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Update organization workflow configuration' })
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateWorkflowConfigDto) {
    return this.workflow.update(user.organizationId, dto);
  }
}
