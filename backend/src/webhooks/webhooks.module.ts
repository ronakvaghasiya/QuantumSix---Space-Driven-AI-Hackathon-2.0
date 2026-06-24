import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { N8nService } from './n8n.service';
import { VcsWebhookService } from './vcs-webhook.service';
import { Task } from '../tasks/entities/task.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
import { Project } from '../projects/entities/project.entity';
import { MemoryModule } from '../memory/memory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskTimeline,
      TaskAnalysis,
      TaskTest,
      TaskCodeDiff,
      TaskValidation,
      TaskPullRequest,
      Project,
    ]),
    MemoryModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, N8nService, VcsWebhookService],
  exports: [N8nService],
})
export class WebhooksModule {}
