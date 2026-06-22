import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UploadTasksDto, ApprovalDto } from './dto/task.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List all tasks' })
  @ApiQuery({ name: 'projectId', required: false })
  findAll(@Query('projectId') projectId?: string) {
    return this.tasksService.findAll(projectId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent tasks' })
  getRecent(@Query('limit') limit?: number) {
    return this.tasksService.getRecent(limit ? Number(limit) : 5);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details' })
  findOne(@Param('id') id: string) {
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
  approveAnalysis(@Param('id') id: string, @Body() dto: ApprovalDto) {
    return this.tasksService.approveAnalysis(id, dto);
  }

  @Post(':id/fix-lint')
  @ApiOperation({ summary: 'Auto-fix ESLint/Prettier issues and re-validate' })
  fixLint(@Param('id') id: string) {
    return this.tasksService.fixLint(id);
  }

  @Post(':id/approve-code')
  @ApiOperation({ summary: 'Approve or reject code changes' })
  approveCode(@Param('id') id: string, @Body() dto: ApprovalDto) {
    return this.tasksService.approveCode(id, dto);
  }

  @Post(':id/pr/merge')
  @ApiOperation({ summary: 'Merge GitLab MR from dashboard' })
  mergePr(@Param('id') id: string) {
    return this.tasksService.mergePr(id);
  }

  @Post(':id/pr/close')
  @ApiOperation({ summary: 'Close GitLab MR from dashboard' })
  closePr(@Param('id') id: string) {
    return this.tasksService.closePr(id);
  }

  @Post(':id/pr/approve')
  @ApiOperation({ summary: 'Approve GitLab MR and post change summary comment' })
  approvePr(@Param('id') id: string) {
    return this.tasksService.approvePr(id);
  }
}
