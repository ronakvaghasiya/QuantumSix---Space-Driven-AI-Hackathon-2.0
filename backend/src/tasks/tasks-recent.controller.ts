import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks/recent')
@UseGuards(PermissionsGuard)
export class TasksRecentController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get recent tasks' })
  @ApiQuery({ name: 'limit', required: false })
  getRecent(@CurrentUser() user: AuthUser, @Query('limit') limit?: number) {
    return this.tasksService.getRecent(user.organizationId, limit ? Number(limit) : 5);
  }
}
