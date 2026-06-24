import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiReviewerService } from './ai-reviewer.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequirePermission } from '../rbac/decorators/require-permission.decorator';
import { Permission } from '../common/enums/organization.enum';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { Task } from '../tasks/entities/task.entity';

@ApiTags('AI Reviewer')
@ApiBearerAuth()
@Controller('tasks/:taskId/ai-review')
@UseGuards(PermissionsGuard)
export class AiReviewerController {
  constructor(
    private readonly aiReviewer: AiReviewerService,
    @InjectRepository(Task) private readonly taskRepo: Repository<Task>,
  ) {}

  private async assertTaskAccess(taskId: string, organizationId: string): Promise<void> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['project'],
    });
    if (!task || task.project?.organizationId !== organizationId) {
      throw new NotFoundException('Task not found');
    }
  }

  @Get()
  @RequirePermission(Permission.VIEW_ALL)
  @ApiOperation({ summary: 'Latest AI code review for a task' })
  async getReview(@CurrentUser() user: AuthUser, @Param('taskId', ParseUUIDPipe) taskId: string) {
    await this.assertTaskAccess(taskId, user.organizationId);
    return this.aiReviewer.getLatest(taskId);
  }

  @Post('regenerate')
  @RequirePermission(Permission.APPROVE_CODE)
  @ApiOperation({ summary: 'Regenerate AI code review' })
  async regenerate(@CurrentUser() user: AuthUser, @Param('taskId', ParseUUIDPipe) taskId: string) {
    await this.assertTaskAccess(taskId, user.organizationId);
    return this.aiReviewer.reviewTask(taskId);
  }
}
