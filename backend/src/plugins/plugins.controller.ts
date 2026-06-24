import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsUUID } from 'class-validator';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginLoaderService } from './plugin-loader.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

class InstallPluginDto {
  @ApiProperty()
  @IsUUID()
  pluginId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

class SetPluginEnabledDto {
  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

@ApiTags('Plugins')
@ApiBearerAuth()
@Controller('plugins')
@UseGuards(PermissionsGuard)
export class PluginsController {
  constructor(
    private readonly registry: PluginRegistryService,
    private readonly loader: PluginLoaderService,
  ) {}

  @Get('catalog')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Marketplace plugin catalog' })
  catalog() {
    return this.registry.listCatalog();
  }

  @Get('installed')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Installed plugins for current org' })
  installed(@CurrentUser() user: AuthUser) {
    return this.loader.listInstalled(user.organizationId);
  }

  @Post('install')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Install plugin for organization' })
  install(@CurrentUser() user: AuthUser, @Body() dto: InstallPluginDto) {
    return this.loader.install(user.organizationId, dto.pluginId, dto.config || {});
  }

  @Put('installed/:pluginId')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Enable or disable installed plugin' })
  setEnabled(
    @CurrentUser() user: AuthUser,
    @Param('pluginId') pluginId: string,
    @Body() dto: SetPluginEnabledDto,
  ) {
    return this.loader.setEnabled(user.organizationId, pluginId, dto.enabled);
  }

  @Post('installed/:pluginId/uninstall')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Uninstall plugin' })
  async uninstall(@CurrentUser() user: AuthUser, @Param('pluginId') pluginId: string) {
    await this.loader.uninstall(user.organizationId, pluginId);
    return { ok: true };
  }
}
