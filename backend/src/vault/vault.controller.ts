import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { VaultService } from './vault.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

class UpsertSecretDto {
  @ApiProperty({ example: 'openai_api_key' })
  @IsString()
  keyName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  value: string;
}

@ApiTags('Vault')
@ApiBearerAuth()
@Controller('vault')
@UseGuards(PermissionsGuard)
export class VaultController {
  constructor(private readonly vault: VaultService) {}

  @Get('secrets')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'List org secrets (masked)' })
  list(@CurrentUser() user: AuthUser) {
    return this.vault.list(user.organizationId);
  }

  @Post('secrets')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Create or update encrypted secret' })
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertSecretDto) {
    return this.vault.upsert(user.organizationId, dto.keyName, dto.value);
  }

  @Delete('secrets/:keyName')
  @RequirePermission(Permission.MANAGE_USERS)
  @ApiOperation({ summary: 'Delete secret' })
  async remove(@CurrentUser() user: AuthUser, @Param('keyName') keyName: string) {
    await this.vault.delete(user.organizationId, keyName);
    return { ok: true };
  }
}
