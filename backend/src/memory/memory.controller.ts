import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RepositoryMemoryService } from './services/repository-memory.service';
import { TaskMemoryService } from './services/task-memory.service';
import { SimilarTaskService } from './services/similar-task.service';
import { AutoReindexService } from './services/auto-reindex.service';
import { MemoryRetrieveDto, SimilarTaskSearchDto } from './dto/memory.dto';

@ApiTags('Memory')
@Controller('memory')
export class MemoryController {
  constructor(
    private readonly repoMemory: RepositoryMemoryService,
    private readonly taskMemory: TaskMemoryService,
    private readonly similarTasks: SimilarTaskService,
    private readonly autoReindex: AutoReindexService,
  ) {}

  @Get('projects/:projectId/snapshots')
  @ApiOperation({ summary: 'List repository memory snapshots' })
  getSnapshots(@Param('projectId') projectId: string) {
    return this.repoMemory.getSnapshots(projectId);
  }

  @Post('retrieve')
  @ApiOperation({ summary: 'Retrieve repository memory context for a requirement' })
  retrieve(@Body() dto: MemoryRetrieveDto) {
    return this.repoMemory.retrieveContext(dto.projectId, dto.requirement, dto.limit);
  }

  @Get('projects/:projectId/tasks')
  @ApiOperation({ summary: 'List indexed task memories for a project' })
  getTaskMemories(@Param('projectId') projectId: string) {
    return this.taskMemory.getByProject(projectId);
  }

  @Get('tasks/:taskId/similar')
  @ApiOperation({ summary: 'Find similar historical tasks' })
  @ApiQuery({ name: 'limit', required: false })
  findSimilar(@Param('taskId') taskId: string, @Query('limit') limit?: number) {
    return this.similarTasks.findSimilarForTask(taskId, limit ? Number(limit) : 5);
  }

  @Post('similar-search')
  @ApiOperation({ summary: 'Search similar tasks by requirement text' })
  searchSimilar(@Body() dto: SimilarTaskSearchDto) {
    return this.similarTasks.searchByRequirement(dto.projectId, dto.requirement, dto.limit);
  }

  @Get('projects/:projectId/reindex-events')
  @ApiOperation({ summary: 'List auto-reindex events' })
  getReindexEvents(@Param('projectId') projectId: string) {
    return this.autoReindex.getEvents(projectId);
  }
}
