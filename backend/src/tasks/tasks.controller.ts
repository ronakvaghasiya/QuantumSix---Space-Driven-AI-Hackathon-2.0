import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UploadTasksDto, ApprovalDto } from './dto/task.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
@UseGuards(PermissionsGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'List tasks in current organization' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@CurrentUser() user: AuthUser, @Query('projectId') projectId?: string) {
    return this.tasksService.findAll(user.organizationId, projectId);
  }

  @Get(':id')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermission(Permission.CREATE_PROJECT)
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.create(dto, user.organizationId);
  }

  @Post('upload')
  @RequirePermission(Permission.CREATE_PROJECT)
  @ApiOperation({ summary: 'Upload tasks via CSV' })
  uploadCsv(@Body() dto: UploadTasksDto, @CurrentUser() user: AuthUser) {
    return this.tasksService.uploadCsv(dto, user.organizationId);
  }

  @Post(':id/approve-analysis')
  @RequirePermission(Permission.APPROVE_ANALYSIS)
  @ApiOperation({ summary: 'Approve or reject analysis/tests' })
  approveAnalysis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.approveAnalysis(id, dto, user.organizationId, user.id);
  }

  @Post(':id/fix-lint')
  @RequirePermission(Permission.APPROVE_CODE)
  @ApiOperation({ summary: 'Auto-fix ESLint/Prettier issues and re-validate' })
  fixLint(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.fixLint(id, user.organizationId);
  }

  @Post(':id/approve-code')
  @RequirePermission(Permission.APPROVE_CODE)
  @ApiOperation({ summary: 'Approve or reject code changes' })
  approveCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.approveCode(id, dto, user.organizationId, user.id);
  }

  @Get(':id/audit')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get task audit trail' })
  getAudit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.getAuditLogs(id, user.organizationId);
  }

  @Get(':id/feedback')
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Get task feedback history' })
  getFeedback(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.getFeedback(id, user.organizationId);
  }

  @Post(':id/pr/merge')
  @RequirePermission(Permission.APPROVE_PR)
  @ApiOperation({ summary: 'Merge GitLab MR from dashboard' })
  mergePr(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.mergePr(id, user.organizationId);
  }

  @Post(':id/pr/close')
  @RequirePermission(Permission.APPROVE_PR)
  @ApiOperation({ summary: 'Close GitLab MR from dashboard' })
  closePr(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.closePr(id, user.organizationId);
  }

  @Post(':id/pr/approve')
  @RequirePermission(Permission.APPROVE_PR)
  @ApiOperation({ summary: 'Approve GitLab MR and post change summary comment' })
  approvePr(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.tasksService.approvePr(id, user.organizationId);
  }
}
