import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { NotificationChannelType } from './enums/notification.enum';

class CreateChannelDto {
  @ApiProperty({ enum: NotificationChannelType })
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: { webhookUrl: 'https://hooks.slack.com/...' } })
  @IsObject()
  config: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false, example: ['analysis_ready', 'pr_created'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}

class UpdateChannelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(PermissionsGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get('channels')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List notification channels for current org' })
  listChannels(@CurrentUser() user: AuthUser) {
    return this.notifications.listChannels(user.organizationId);
  }

  @Post('channels')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Create notification channel' })
  createChannel(@CurrentUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    const config = { ...dto.config };
    if (dto.events?.length) config.events = dto.events;
    return this.notifications.createChannel(user.organizationId, {
      type: dto.type,
      name: dto.name,
      config,
      enabled: dto.enabled ?? true,
    });
  }

  @Put('channels/:id')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Update notification channel' })
  updateChannel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.config !== undefined || dto.events !== undefined) {
      data.config = { ...(dto.config || {}), ...(dto.events ? { events: dto.events } : {}) };
    }
    return this.notifications.updateChannel(user.organizationId, id, data);
  }

  @Delete('channels/:id')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Delete notification channel' })
  async deleteChannel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.notifications.deleteChannel(user.organizationId, id);
    return { ok: true };
  }

  @Get('deliveries')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Recent notification delivery log' })
  deliveries(@CurrentUser() user: AuthUser) {
    return this.notifications.listDeliveries(user.organizationId);
  }
}
