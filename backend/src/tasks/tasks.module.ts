import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksRecentController } from './tasks-recent.controller';
import { PipelineController } from './pipeline.controller';
import { TasksService } from './tasks.service';
import { LlmService } from './services/llm.service';
import { TaskPipelineService } from './services/task-pipeline.service';
import { ValidationRunnerService } from './services/validation-runner.service';
import { TaskGitService } from './services/task-git.service';
import { CodeContextService } from './services/code-context.service';
import { QaTestService } from './services/qa-test.service';
import { Task } from './entities/task.entity';
import { TaskTimeline } from './entities/task-timeline.entity';
import { TaskAnalysis } from './entities/task-analysis.entity';
import { TaskTest } from './entities/task-test.entity';
import { TaskCodeDiff } from './entities/task-code-diff.entity';
import { TaskValidation } from './entities/task-validation.entity';
import { TaskPullRequest } from './entities/task-pull-request.entity';
import { TaskFeedback } from './entities/task-feedback.entity';
import { PlaywrightRun } from './entities/playwright-run.entity';
import { SecurityScan } from '../security/entities/security-scan.entity';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RepositoryModule } from '../repository/repository.module';
import { GitLabModule } from '../gitlab/gitlab.module';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { FeedbackModule } from '../feedback/feedback.module';
import { SecurityModule } from '../security/security.module';
import { SettingsModule } from '../settings/settings.module';
import { MemoryModule } from '../memory/memory.module';
import { RiskModule } from '../risk/risk.module';
import { Project } from '../projects/entities/project.entity';

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
      TaskFeedback,
      PlaywrightRun,
      SecurityScan,
      Project,
    ]),
    WebhooksModule,
    RepositoryModule,
    GitLabModule,
    AiModule,
    AuditModule,
    FeedbackModule,
    SecurityModule,
    SettingsModule,
    MemoryModule,
    RiskModule,
  ],
  controllers: [TasksRecentController, TasksController, PipelineController],
  providers: [
    TasksService,
    LlmService,
    TaskPipelineService,
    TaskGitService,
    CodeContextService,
    QaTestService,
    ValidationRunnerService,
  ],
  exports: [TasksService, TaskPipelineService, LlmService],
})
export class TasksModule {}
