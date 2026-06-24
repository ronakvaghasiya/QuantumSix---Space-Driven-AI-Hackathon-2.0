import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiReview } from './entities/ai-review.entity';
import { AiReviewerService } from './ai-reviewer.service';
import { AiReviewerController } from './ai-reviewer.controller';
import { Task } from '../tasks/entities/task.entity';
import { TaskCodeDiff } from '../tasks/entities/task-code-diff.entity';
import { TaskValidation } from '../tasks/entities/task-validation.entity';
import { RiskAssessment } from '../risk/entities/risk-assessment.entity';
import { RbacModule } from '../rbac/rbac.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiReview,
      Task,
      TaskCodeDiff,
      TaskValidation,
      RiskAssessment,
    ]),
    forwardRef(() => TasksModule),
    RbacModule,
  ],
  controllers: [AiReviewerController],
  providers: [AiReviewerService],
  exports: [AiReviewerService],
})
export class AiReviewerModule {}
