import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Task } from '../tasks/entities/task.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { Project } from '../projects/entities/project.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { Release } from '../releases/entities/release.entity';
import { ReindexEvent } from '../memory/entities/reindex-event.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskValidation,
      Project,
      RiskAssessment,
      Release,
      ReindexEvent,
    ]),
    RbacModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
