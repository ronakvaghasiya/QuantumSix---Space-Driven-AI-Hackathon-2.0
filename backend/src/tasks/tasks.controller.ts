import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UploadTasksDto, ApprovalDto, RevertCodeDto } from './dto/task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('projectId') projectId?: string) {
    return this.tasksService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload tasks via CSV' })
  uploadCsv(@Body() dto: UploadTasksDto) {
    return this.tasksService.uploadCsv(dto);
  }

  @Post(':id/approve-analysis')
  @ApiOperation({ summary: 'Approve or reject analysis/tests' })
  approveAnalysis(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApprovalDto) {
    return this.tasksService.approveAnalysis(id, dto);
  }

  @Post(':id/fix-lint')
  @ApiOperation({ summary: 'Auto-fix ESLint/Prettier issues and re-validate' })
  fixLint(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.fixLint(id);
  }

  @Post(':id/retry-pr')
  @ApiOperation({ summary: 'Create GitLab MR after validation passes' })
  retryPr(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.retryPr(id);
  }

  @Post('by-task-id/:taskId/restart')
  @ApiOperation({ summary: 'Restart task pipeline from beginning (by display task ID e.g. BB-1006)' })
  restartByTaskId(@Param('taskId') taskId: string) {
    return this.tasksService.restartByTaskId(taskId);
  }

  @Delete('by-task-id/:taskId')
  @ApiOperation({ summary: 'Delete task permanently by display ID (e.g. BB-1006)' })
  deleteByTaskId(@Param('taskId') taskId: string) {
    return this.tasksService.deleteByTaskId(taskId);
  }

  @Post(':id/restart')
  @ApiOperation({ summary: 'Restart task pipeline from beginning' })
  restart(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.restart(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task permanently from database' })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.delete(id);
  }

  @Post(':id/retry-codegen')
  @ApiOperation({ summary: 'Re-run code generation after a failed attempt' })
  retryCodegen(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.retryCodegen(id);
  }

  @Post(':id/revert-code')
  @ApiOperation({ summary: 'Revert AI code changes (specific files or all)' })
  revertCode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RevertCodeDto) {
    return this.tasksService.revertCode(id, dto);
  }

  @Post(':id/approve-code')
  @ApiOperation({ summary: 'Approve or reject code changes' })
  approveCode(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApprovalDto) {
    return this.tasksService.approveCode(id, dto);
  }

  @Get(':id/audit')
  @ApiOperation({ summary: 'Get task audit trail' })
  getAudit(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getAuditLogs(id);
  }

  @Get(':id/feedback')
  @ApiOperation({ summary: 'Get task feedback history' })
  getFeedback(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getFeedback(id);
  }

  @Post(':id/pr/merge')
  @ApiOperation({ summary: 'Merge GitLab MR from dashboard' })
  mergePr(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.mergePr(id);
  }

  @Post(':id/pr/close')
  @ApiOperation({ summary: 'Close GitLab MR from dashboard' })
  closePr(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.closePr(id);
  }

  @Post(':id/pr/approve')
  @ApiOperation({ summary: 'Approve GitLab MR and post change summary comment' })
  approvePr(@Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.approvePr(id);
  }
}
