import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Task } from '../tasks/entities/task.entity';
import { TaskPullRequest } from '../tasks/entities/task-pull-request.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { TaskTimeline } from '../tasks/entities/task-timeline.entity';
import { TaskTest } from '../tasks/entities/task-test.entity';
import { Project } from '../projects/entities/project.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskPullRequest, TaskValidation, TaskTimeline, TaskTest, Project])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
