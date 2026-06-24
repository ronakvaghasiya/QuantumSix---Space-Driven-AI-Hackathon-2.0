import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Releases')
@ApiBearerAuth()
@Controller('releases')
@UseGuards(PermissionsGuard)
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Get()
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Recent releases for current organization' })
  listRecent(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.releases.listByOrganization(user.organizationId, limit ? Number(limit) : 20);
  }

  @Get('projects/:projectId')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Releases for a project' })
  listByProject(@CurrentUser() user: AuthUser, @Param('projectId') projectId: string) {
    return this.releases.listByProject(projectId, user.organizationId);
  }

  @Get(':id')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get release by id' })
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.releases.findOne(id, user.organizationId);
  }
}
