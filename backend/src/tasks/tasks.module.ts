import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { PipelineController } from './pipeline.controller';
import { TasksService } from './tasks.service';
import { LlmService } from './services/llm.service';
import { TaskPipelineService } from './services/task-pipeline.service';
import { ValidationRunnerService } from './services/validation-runner.service';
import { TaskGitService } from './services/task-git.service';
import { CodeContextService } from './services/code-context.service';
import { Task } from './entities/task.entity';
import { TaskTimeline } from './entities/task-timeline.entity';
import { TaskAnalysis } from './entities/task-analysis.entity';
import { TaskTest } from './entities/task-test.entity';
import { TaskCodeDiff } from './entities/task-code-diff.entity';
import { TaskValidation } from './entities/task-validation.entity';
import { TaskPullRequest } from './entities/task-pull-request.entity';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RepositoryModule } from '../repository/repository.module';
import { GitLabModule } from '../gitlab/gitlab.module';

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
    ]),
    WebhooksModule,
    RepositoryModule,
    GitLabModule,
  ],
  controllers: [TasksController, PipelineController],
  providers: [
    TasksService,
    LlmService,
    TaskPipelineService,
    TaskGitService,
    CodeContextService,
    ValidationRunnerService,
  ],
  exports: [TasksService, TaskPipelineService],
})
export class TasksModule {}
