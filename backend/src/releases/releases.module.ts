import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Release } from './entities/release.entity';
import { ReleasesService } from './releases.service';
import { ReleaseIntelligenceService } from './services/release-intelligence.service';
import { ReleasesController } from './releases.controller';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { AiReview } from '../ai-reviewer/entities/ai-review.entity';
import { TasksModule } from '../tasks/tasks.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Release,
      TaskCodeDiff,
      TaskValidation,
      RiskAssessment,
      AiReview,
    ]),
    forwardRef(() => TasksModule),
    OrganizationsModule,
    RbacModule,
  ],
  controllers: [ReleasesController],
  providers: [ReleasesService, ReleaseIntelligenceService],
  exports: [ReleasesService, ReleaseIntelligenceService],
})
export class ReleasesModule {}
