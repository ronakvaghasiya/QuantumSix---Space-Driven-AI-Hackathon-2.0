import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@Controller('tasks/recent')
export class TasksRecentController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent tasks' })
  @ApiQuery({ name: 'limit', required: false })
  getRecent(@Query('limit') limit?: number) {
    return this.tasksService.getRecent(limit ? Number(limit) : 5);
  }
}
