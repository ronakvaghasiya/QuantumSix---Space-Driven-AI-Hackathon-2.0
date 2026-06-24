import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { Project } from '../projects/entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskAnalysis } from '../tasks/entities/task-analysis.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Task,
      TaskTimeline,
      TaskAnalysis,
      TaskTest,
      TaskCodeDiff,
      TaskValidation,
      TaskPullRequest,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
